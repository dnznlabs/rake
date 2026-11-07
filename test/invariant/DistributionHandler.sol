// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CommonBase} from "forge-std/Base.sol";
import {StdUtils} from "forge-std/StdUtils.sol";
import {Distribution, DistributionFactory} from "../../src/Distribution.sol";
import {GasBurner, MockERC20, RevertingReceiver} from "../mocks/Mocks.sol";

/// @notice The one caller the invariant fuzzer is allowed. It owns a single `Distribution` created
/// through the real factory, and every state-changing entry point that contract has is wrapped by
/// exactly one function here — so forge's own call summary, which counts calls per handler selector,
/// is the evidence that each entry point was reached.
///
/// @dev Three rules hold everything together:
///
/// 1. **Bounded inputs.** Every payee, escrow account and `claim` destination is drawn from the fixed
///    `actors` set and every token from the fixed `tokens` set, so the ghosts below can account for
///    every wei and every token unit that leaves the distribution. A table row outside that set would
///    put money somewhere the ghost cannot see and `invariant_conservation` would read it as a loss.
/// 2. **Expected reverts are caught and counted, never left to bubble.** `fail_on_revert = false` is
///    set, so a bubbled revert would be silently discarded and the fuzzer would spend that step of its
///    depth on nothing. `absorbed[i]` counts the legitimate refusals per entry point — a stranger
///    proposing, an eta not reached, an escrow that is not there — and `afterInvariant` prints them
///    under `INV_SUMMARY`, so they are reported rather than swallowed.
/// 3. **Ghost bookkeeping is O(1) per call.** The window, double-apply and apply-after-cancel
///    properties are evaluated the moment `applyQueued` returns and kept as counters, because an
///    invariant runs after *every* call in the sequence and a scan over the recorded actions would
///    make the suite quadratic in `depth`.
///
/// `warp` is the only way time moves, bounded to `[0, 2 × GRACE]` per step so an eta is reachable and
/// so is the far side of the grace window. Nothing here touches `src/`.
contract DistributionHandler is CommonBase, StdUtils {
    /// @dev One index per handler function, which is one index per `Distribution` entry point. `init`
    /// is the exception: it is reached once, in this contract's constructor, through `create`.
    uint256 internal constant DEPOSIT = 0;
    uint256 internal constant DISTRIBUTE = 1;
    uint256 internal constant RELEASE = 2;
    uint256 internal constant CLAIM = 3;
    uint256 internal constant SET_TABLE = 4;
    uint256 internal constant SET_DESCRIPTION = 5;
    uint256 internal constant SET_DELAY = 6;
    uint256 internal constant TRANSFER_OWNERSHIP = 7;
    uint256 internal constant STRANGER_PROPOSE = 8;
    uint256 internal constant APPLY_QUEUED = 9;
    uint256 internal constant CANCEL = 10;
    uint256 internal constant ACCEPT_OWNERSHIP = 11;
    uint256 internal constant WARP = 12;
    uint256 internal constant MINT = 13;
    uint256 internal constant ENTRY_POINTS = 14;

    address public constant OWNER = address(0xB0B);
    address public constant PAYEE = address(0x1001);
    address public constant STRANGER_1 = address(0x5EE);
    address public constant STRANGER_2 = address(0x5EF);

    uint256 public constant ACTORS = 6;
    uint256 public constant TOKENS = 3;

    /// @notice The distribution under test, and the factory that placed it.
    Distribution public immutable dist;
    DistributionFactory public immutable factory;

    /// @notice A beneficiary that refuses ETH until `release`/`claim` flips it, so both the escrow and
    /// the successful retry are reachable from one actor.
    RevertingReceiver public immutable refuser;
    /// @notice A beneficiary that spends the whole `PUSH_GAS` cap and then fails, so its share can only
    /// ever be escrowed and only ever leave through `claim` (F5, decision 40).
    GasBurner public immutable burner;

    /// @notice The plain ERC-20 and the one that reports failure without moving a balance.
    MockERC20 public immutable plain;
    MockERC20 public immutable liar;

    /// @dev Every address money may reach. The table, `release`'s account and `claim`'s destination are
    /// all drawn from here, which is what makes `invariant_conservation` exact.
    address[ACTORS] public actors;
    /// @dev ETH first, so index 0 is `address(0)` the way the contract spells it.
    address[TOKENS] public tokens;
    /// @dev `actors` without the burner: an uncapped `claim` to it would spin until the frame ran out
    /// of gas, which costs the campaign wall time and proves nothing the escrow side does not.
    address[ACTORS - 1] public payees;

    /// @notice Every wei this handler has put into the distribution, including the value that rode the
    /// `create`. The only source of ETH the distribution has.
    uint256 public ethIn;
    /// @notice Every token unit minted into the distribution, per token.
    mapping(address => uint256) public tokenIn;

    /// @notice Set when a `transferOwnership(address(0))` action lands. Final: `pendingOwner` is zeroed
    /// with it, so `acceptOwnership` can never bring an owner back.
    bool public renounced;
    /// @notice A `propose` that succeeded for someone who was not the owner. Must stay zero.
    uint256 public strangerProposals;
    /// @notice An `applyQueued` that succeeded for an action the ghost had already seen applied.
    uint256 public doubleApplies;
    /// @notice An `applyQueued` that succeeded for an action the ghost had seen cancelled or cleared.
    uint256 public appliesAfterCancel;
    /// @notice An `applyQueued` that succeeded at a time outside `[eta, eta + GRACE]`.
    uint256 public outsideWindowApplies;

    /// @dev Bumped whenever the contract clears its whole queue — a handover or a renounce. An entry
    /// proposed before the bump is cancelled by it, which is an epoch comparison rather than a walk.
    uint256 public clearEpoch;

    uint256[ENTRY_POINTS] public calls;
    uint256[ENTRY_POINTS] public absorbed;

    /// @dev `eta` is computed from the delay in force when the action was proposed, never read back out
    /// of `queued`, so the window check does not ask the contract to confirm its own answer.
    /// `renounces` is recorded by the function that built the action rather than decoded back out of
    /// `action`: the proposer knows, and a ghost that re-parses calldata is a second ABI decoder to
    /// get wrong.
    struct Entry {
        bytes action;
        uint32 nonce;
        bytes32 hash;
        uint256 eta;
        uint256 epoch;
        bool applied;
        bool cancelled;
        bool renounces;
    }

    Entry[] internal _entries;

    /// @dev The table the distribution starts with: the payee, the refuser and the burner, so a
    /// `distribute` escrows something from the first call rather than waiting for a re-table.
    /// @param atInit How much of `msg.value` rides the `create`. The rest stays here as the purse
    /// `deposit` draws on, so the two are named separately rather than inferred from the balance.
    constructor(DistributionFactory factory_, uint256 atInit) payable {
        require(atInit <= msg.value, "atInit over the value sent");

        factory = factory_;

        refuser = new RevertingReceiver();
        burner = new GasBurner();
        plain = new MockERC20(MockERC20.Ret.True);
        liar = new MockERC20(MockERC20.Ret.False);

        actors[0] = OWNER;
        actors[1] = PAYEE;
        actors[2] = STRANGER_1;
        actors[3] = STRANGER_2;
        actors[4] = address(refuser);
        actors[5] = address(burner);

        payees[0] = OWNER;
        payees[1] = PAYEE;
        payees[2] = STRANGER_1;
        payees[3] = STRANGER_2;
        payees[4] = address(refuser);

        tokens[0] = address(0);
        tokens[1] = address(plain);
        tokens[2] = address(liar);

        address[] memory rows = new address[](3);
        rows[0] = PAYEE;
        rows[1] = address(refuser);
        rows[2] = address(burner);
        _asc(rows);

        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = Distribution.Beneficiary({account: rows[0], bps: 5000, name: "a", note: ""});
        t[1] = Distribution.Beneficiary({account: rows[1], bps: 3000, name: "b", note: ""});
        t[2] = Distribution.Beneficiary({account: rows[2], bps: 2000, name: "c", note: ""});

        // The salt's top 20 bytes must be the sender, so the handler is what calls `create`. The value
        // rides the CREATE2 and reaches `init`, which logs it as `Received(address(0), …)`.
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(1));
        ethIn = atInit;
        dist = Distribution(payable(factory_.create{value: atInit}(OWNER, 0, "inv", t, salt)));
    }

    // ---------------------------------------------------------------- the money paths

    /// @notice `receive()`, in both shapes a real sender uses: `viaStipend` forwards 2,300 gas and
    /// nothing else, the way `address.transfer` does, and the other arm forwards everything.
    /// @dev The stipend arm fails whenever the implementation account is cold, which it is on the
    /// first touch of a transaction: a clone's `receive()` is a DELEGATECALL into the implementation
    /// and the 2,600 gas a cold account costs does not fit in 2,300. Counted as an absorbed refusal
    /// rather than left to bubble — the handoff's § Discoveries has the measurement, because
    /// `test_receiveUnderStipend` passes only on a warm implementation.
    /// @dev `amount` is bounded to a fraction of what is left rather than an absolute, so 12,800 calls
    /// cannot drain the handler and turn every later deposit into a no-op.
    function deposit(uint96 amount, bool viaStipend) external {
        calls[DEPOSIT]++;
        uint256 amt = _bound(amount, 0, address(this).balance / 128 + 1);
        if (amt > address(this).balance) {
            absorbed[DEPOSIT]++;
            return;
        }
        // `gas: 0` with a value is exactly what `transfer` compiles to — nothing forwarded, plus the
        // 2,300 stipend — but it answers with a bool instead of reverting the handler call.
        (bool ok,) = payable(address(dist)).call{value: amt, gas: viaStipend ? 0 : gasleft()}("");
        if (!ok) {
            absorbed[DEPOSIT]++;
            return;
        }
        ethIn += amt;
    }

    /// @notice `distribute`. Refuses with `NothingToDo` when nothing is unreserved, which is expected.
    function distribute(uint256 tokenSeed) external {
        calls[DISTRIBUTE]++;
        try dist.distribute(tokens[_bound(tokenSeed, 0, TOKENS - 1)]) {}
        catch {
            absorbed[DISTRIBUTE]++;
        }
    }

    /// @notice `release`. `accepting` is the refuser's mood, so the retry is reached in both outcomes;
    /// `targeted` aims at a pair that actually holds an escrow, so the success path is not left to a
    /// one-in-eighteen guess among the token/account pairs.
    function release(uint256 tokenSeed, uint256 actorSeed, bool accepting, bool targeted) external {
        calls[RELEASE]++;
        refuser.setAccepting(accepting);
        (address token, address account) = _pair(tokenSeed, actorSeed, targeted);
        try dist.release(token, account) {}
        catch {
            absorbed[RELEASE]++;
        }
    }

    /// @notice `claim`, from the escrowed account itself, to a destination it names.
    function claim(uint256 tokenSeed, uint256 actorSeed, uint256 toSeed, bool accepting, bool targeted) external {
        calls[CLAIM]++;
        refuser.setAccepting(accepting);
        (address token, address account) = _pair(tokenSeed, actorSeed, targeted);
        address to = payees[_bound(toSeed, 0, ACTORS - 2)];
        vm.prank(account);
        try dist.claim(token, to) {}
        catch {
            absorbed[CLAIM]++;
        }
    }

    /// @notice Tokens arrive the way a real one does: a transfer in, with no log the contract reads.
    function mint(uint256 tokenSeed, uint96 amount) external {
        calls[MINT]++;
        address token = tokens[_bound(tokenSeed, 1, TOKENS - 1)];
        uint256 amt = _bound(amount, 0, 1e24);
        MockERC20(token).mint(address(dist), amt);
        tokenIn[token] += amt;
    }

    // ---------------------------------------------------------------- the timelock

    /// @notice `propose(setBeneficiaries)`. One table in eight breaks the ascending rule, so `_set`'s
    /// refusal is exercised and `invariant_tableSumsToBps` is asked about a table that was rejected.
    function proposeSetTable(uint256 rowSeed, uint256 splitSeed) external {
        calls[SET_TABLE]++;
        _propose(SET_TABLE, abi.encodeCall(Distribution.setBeneficiaries, (_randomTable(rowSeed, splitSeed))), false);
    }

    function proposeSetDescription(uint256 seed) external {
        calls[SET_DESCRIPTION]++;
        string memory text = string(abi.encodePacked("d", bytes32(seed)));
        _propose(SET_DESCRIPTION, abi.encodeCall(Distribution.setDescription, (text)), false);
    }

    /// @notice `propose(setDelay)`. Zero one time in four and `[1, GRACE]` otherwise.
    /// @dev Zero is given its own quarter rather than left to the bound: it is one value out of
    /// 1,209,601, so a uniform draw never picks it, and with a non-zero delay in force `propose`
    /// always takes the queueing branch. A quarter of the calls keeps the inline branch — a zero delay
    /// is a supported configuration, `test_delayZeroAppliesInline` is its unit test — in the sequence.
    function proposeSetDelay(uint32 delay_) external {
        calls[SET_DELAY]++;
        uint32 bounded = uint256(keccak256(abi.encode(delay_))) % 4 == 0
            // The cast is safe because `GRACE` is 14 days in seconds, far below `type(uint32).max`.
            // forge-lint: disable-next-line(unsafe-typecast)
            ? 0
            : uint32(_bound(delay_, 1, dist.GRACE()));
        _propose(SET_DELAY, abi.encodeCall(Distribution.setDelay, (bounded)), false);
    }

    /// @notice `propose(transferOwnership)`, a nomination until the sequence has done its other work
    /// and then, one call in four, the renounce.
    /// @dev A renounce is terminal: nothing can be proposed again for the rest of the sequence, so its
    /// rate decides how much of the suite actually runs. Both flat rates were measured and both were
    /// wrong. At one in seven a 51,200-call sequence queued **one** action in total — the owner was
    /// gone inside the first thirty calls and every later `propose`, `applyQueued`, `cancel` and
    /// `acceptOwnership` was refused, so the timelock half of the suite had stopped being exercised
    /// while all seven invariants still passed. At one in 64 the opposite: **no** sequence of 200
    /// calls reached a renounce in 25 tries, so `invariant_ownerOrNobody`'s post-renounce half never
    /// ran at all. Holding it back until the timelock and the money paths have been exercised puts it
    /// late in a run instead of at the start or never.
    /// The seed is hashed rather than taken modulo: the fuzzer's dictionary is full of round numbers,
    /// so `actorSeed % 4 == 0` would fire far more often than one call in four.
    function proposeTransferOwnership(uint256 actorSeed) external {
        calls[TRANSFER_OWNERSHIP]++;
        bool renounce = _renounceAllowed() && uint256(keccak256(abi.encode(actorSeed))) % 4 == 0;
        address next = renounce ? address(0) : actors[_bound(actorSeed, 0, ACTORS - 1)];
        _propose(TRANSFER_OWNERSHIP, abi.encodeCall(Distribution.transferOwnership, (next)), renounce);
    }

    /// @dev Whether the sequence has exercised enough of the contract to be allowed to end it.
    function _renounceAllowed() internal view returns (bool) {
        return calls[APPLY_QUEUED] >= 8 && calls[DISTRIBUTE] >= 8 && calls[CANCEL] >= 4;
    }

    /// @notice `propose` from someone who is not the owner. Expected to revert `NotOwner` every time;
    /// a success is counted and `invariant_ownerOrNobody` asserts the count is zero.
    function proposeFromStranger(uint256 actorSeed, uint32 delay_) external {
        calls[STRANGER_PROPOSE]++;
        vm.prank(_stranger(dist.owner(), actorSeed));
        try dist.propose(abi.encodeCall(Distribution.setDelay, (delay_))) {
            strangerProposals++;
        } catch {
            absorbed[STRANGER_PROPOSE]++;
        }
    }

    /// @notice `applyQueued`. Half the picks are from the newest few entries, which is where a matured
    /// eta usually is; the rest are uniform, which is how an expired one gets tried.
    function applyQueued(uint256 seed) external {
        calls[APPLY_QUEUED]++;
        uint256 n = _entries.length;
        if (n == 0) {
            absorbed[APPLY_QUEUED]++;
            return;
        }
        uint256 i = (seed & 1) == 0 && n > 8 ? n - 1 - _bound(seed >> 1, 0, 7) : _bound(seed >> 1, 0, n - 1);
        Entry storage e = _entries[i];
        bool wasApplied = e.applied;
        bool wasCancelled = e.cancelled || e.epoch < clearEpoch;
        bool renounces = e.renounces;
        uint256 eta = e.eta;

        try dist.applyQueued(e.action, e.nonce) {
            if (wasApplied) doubleApplies++;
            if (wasCancelled) appliesAfterCancel++;
            if (!_inWindow(eta)) outsideWindowApplies++;
            e.applied = true;
            _onApplied(renounces);
        } catch {
            absorbed[APPLY_QUEUED]++;
        }
    }

    /// @notice `cancel`, as the owner or as a stranger — the second only ever succeeds past the grace
    /// window, which is decision 39's "a renounced owner cannot leave the queue uncleanable".
    function cancel(uint256 seed, bool asStranger) external {
        calls[CANCEL]++;
        uint256 n = _entries.length;
        if (n == 0) {
            absorbed[CANCEL]++;
            return;
        }
        Entry storage e = _entries[_bound(seed, 0, n - 1)];
        address o = dist.owner();
        address who = (asStranger || o == address(0)) ? _stranger(o, seed) : o;
        vm.prank(who);
        try dist.cancel(e.hash) {
            e.cancelled = true;
        } catch {
            absorbed[CANCEL]++;
        }
    }

    /// @notice `acceptOwnership`, usually by the address actually nominated, sometimes by a stranger.
    function acceptOwnership(uint256 actorSeed) external {
        calls[ACCEPT_OWNERSHIP]++;
        address pending = dist.pendingOwner();
        address who = (pending != address(0) && actorSeed % 4 != 0) ? pending : actors[_bound(actorSeed, 0, ACTORS - 1)];
        vm.prank(who);
        try dist.acceptOwnership() {
            clearEpoch++;
        } catch {
            absorbed[ACCEPT_OWNERSHIP]++;
        }
    }

    /// @notice The only way time moves. `[0, 2 × GRACE]` per step, so an eta matures and then expires.
    function warp(uint32 dt) external {
        calls[WARP]++;
        vm.warp(block.timestamp + _bound(dt, 0, 2 * dist.GRACE()));
    }

    // ---------------------------------------------------------------- views the invariants read

    function entryCount() external view returns (uint256) {
        return _entries.length;
    }

    /// @notice One short line per entry point, for `afterInvariant`'s summary.
    function labels() external pure returns (string[ENTRY_POINTS] memory l) {
        l[DEPOSIT] = "receive";
        l[DISTRIBUTE] = "distribute";
        l[RELEASE] = "release";
        l[CLAIM] = "claim";
        l[SET_TABLE] = "propose:setBeneficiaries";
        l[SET_DESCRIPTION] = "propose:setDescription";
        l[SET_DELAY] = "propose:setDelay";
        l[TRANSFER_OWNERSHIP] = "propose:transferOwnership";
        l[STRANGER_PROPOSE] = "propose:stranger";
        l[APPLY_QUEUED] = "applyQueued";
        l[CANCEL] = "cancel";
        l[ACCEPT_OWNERSHIP] = "acceptOwnership";
        l[WARP] = "warp";
        l[MINT] = "mint";
    }

    // ---------------------------------------------------------------- internals

    /// @dev Proposes as the owner. With `delay == 0` the action runs inline, so the entry is recorded
    /// applied at this instant; otherwise it is recorded queued at `now + delay`. A propose while the
    /// owner is `address(0)` is sent by a stranger on purpose: pranking `address(0)` would walk past
    /// `msg.sender != owner` and prove a hole nobody can reach on a real chain.
    function _propose(uint256 idx, bytes memory action, bool renounces) internal {
        address o = dist.owner();
        bool ownerless = o == address(0);
        uint32 n = dist.nonce() + 1;
        uint32 delay_ = dist.delay();

        vm.prank(ownerless ? STRANGER_1 : o);
        try dist.propose(action) returns (bytes32 hash) {
            if (ownerless) strangerProposals++;
            _entries.push(
                Entry({
                    action: action,
                    nonce: n,
                    hash: hash,
                    eta: delay_ == 0 ? block.timestamp : block.timestamp + delay_,
                    epoch: clearEpoch,
                    applied: delay_ == 0,
                    cancelled: false,
                    renounces: renounces
                })
            );
            // A zero delay runs the action inline, so it has already landed by the time this returns.
            if (delay_ == 0) _onApplied(renounces);
        } catch {
            absorbed[idx]++;
        }
    }

    /// @dev What the ghost learns from an action that landed. A renounce zeroes the owner and clears
    /// the whole queue, which the epoch records; a nomination does neither.
    function _onApplied(bool renounces) internal {
        if (!renounces) return;
        renounced = true;
        clearEpoch++;
    }

    /// @dev `[eta, eta + GRACE]`, the window `applyQueued` is supposed to honour.
    function _inWindow(uint256 eta) internal view returns (bool) {
        // A timelock is a timestamp comparison, the same reading `src/Distribution.sol` takes.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < eta) return false;
        // forge-lint: disable-next-line(block-timestamp)
        return block.timestamp <= eta + dist.GRACE();
    }

    /// @dev A token/account pair for `release` and `claim`. Untargeted it is a free choice among the
    /// eighteen, which is mostly `NothingToDo` — a refusal worth reaching, and counted. Targeted it is
    /// the first pair from a seeded offset that actually holds an escrow, so the paths that move money
    /// are reached by construction rather than by a one-in-eighteen guess; if nothing is escrowed the
    /// free choice stands.
    function _pair(uint256 tokenSeed, uint256 actorSeed, bool targeted)
        internal
        view
        returns (address token, address account)
    {
        token = tokens[_bound(tokenSeed, 0, TOKENS - 1)];
        account = actors[_bound(actorSeed, 0, ACTORS - 1)];
        if (!targeted) return (token, account);

        uint256 t0 = _bound(tokenSeed, 0, TOKENS - 1);
        uint256 a0 = _bound(actorSeed, 0, ACTORS - 1);
        for (uint256 i; i < TOKENS; ++i) {
            address tk = tokens[(t0 + i) % TOKENS];
            for (uint256 j; j < ACTORS; ++j) {
                address who = actors[(a0 + j) % ACTORS];
                if (dist.escrowed(tk, who) != 0) return (tk, who);
            }
        }
    }

    /// @dev An actor that is not the current owner, so `propose` is refused for the right reason.
    function _stranger(address o, uint256 seed) internal view returns (address) {
        uint256 start = _bound(seed, 0, ACTORS - 1);
        for (uint256 i; i < ACTORS; ++i) {
            address candidate = actors[(start + i) % ACTORS];
            if (candidate != o) return candidate;
        }
        return STRANGER_1;
    }

    /// @dev A table of between one and six rows, every row an actor, shares summing to 10,000 with no
    /// zero row — the shape `_set` accepts. One seed in eight duplicates the first row instead, which
    /// is the ascending rule broken: `propose` then reverts `BadTable` and the table does not move.
    function _randomTable(uint256 rowSeed, uint256 splitSeed)
        internal
        view
        returns (Distribution.Beneficiary[] memory t)
    {
        uint256 n = _bound(rowSeed, 1, ACTORS);
        uint256 offset = rowSeed % ACTORS;

        address[] memory rows = new address[](n);
        for (uint256 i; i < n; ++i) {
            rows[i] = actors[(offset + i) % ACTORS];
        }
        _asc(rows);
        if (n > 1 && splitSeed % 8 == 0) rows[1] = rows[0];

        t = new Distribution.Beneficiary[](n);
        uint96 left = 10_000;
        for (uint256 i; i < n; ++i) {
            uint96 bps;
            if (i + 1 == n) {
                bps = left;
            } else {
                // Leave one bp for every row still to come, so no row can land on zero.
                uint256 max = left - (n - i - 1);
                // forge-lint: disable-next-line(unsafe-typecast)
                bps = uint96(_bound(uint256(keccak256(abi.encode(splitSeed, i))), 1, max));
            }
            left -= bps;
            t[i] = Distribution.Beneficiary({account: rows[i], bps: bps, name: "r", note: ""});
        }
    }

    /// @dev Insertion sort, the same construction `DistributionTest._asc` uses: mock addresses are not
    /// known at authoring time and `_set` requires the table to ascend by account.
    function _asc(address[] memory a) internal pure {
        for (uint256 i = 1; i < a.length; ++i) {
            address x = a[i];
            uint256 j = i;
            while (j > 0 && a[j - 1] > x) {
                a[j] = a[j - 1];
                --j;
            }
            a[j] = x;
        }
    }
}
