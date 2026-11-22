// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Distribution} from "../../src/Distribution.sol";

/// @notice A beneficiary that refuses ETH until it is told not to, so a push can be made to fail and
/// then to succeed on release.
contract RevertingReceiver {
    error Refused();

    bool public accepting;

    function setAccepting(bool accepting_) external {
        accepting = accepting_;
    }

    receive() external payable {
        if (!accepting) revert Refused();
    }
}

/// @notice A beneficiary that spends every unit `_push` forwards it and then fails, which is the
/// worst case a row can cost `distribute`: the full `PUSH_GAS` cap plus the escrow writes.
/// @dev The loop runs until the call frame is out of gas, so the frame reverts, the caller's `call`
/// returns `false` and `distribute` escrows the share and carries on. A revert here would be cheap
/// and would measure the wrong thing — the point is to consume the cap, not to refuse the ETH.
/// Etched at many addresses by `TableCap.t.sol` rather than deployed once, so a table of `n` rows
/// has `n` distinct burners without `n` deploys.
contract GasBurner {
    receive() external payable {
        while (true) {}
    }
}

/// @notice A beneficiary that spends the whole push cap and then reverts with 0x31000 bytes of return
/// data, which is what `distribute` used to copy on every failed ETH push (F6).
/// @dev `GasBurner` measures a row that spends the cap; this measures a row that spends the cap *and*
/// hands back something to copy. Touching 0x31000 bytes of memory costs about 95,600 gas — inside
/// `PUSH_GAS`, which is why leg 2 chose the figure — so the frame can pay the expansion and still
/// revert with the whole range. A separate contract rather than an arm on `GasBurner`: `TableCap.t.sol`
/// etches the burner at every row of four tables, so growing it would move every figure in that file.
contract BloatingReceiver {
    receive() external payable {
        assembly ("memory-safe") {
            // The expansion is charged here rather than left to `revert`, so the frame pays it whether
            // or not the caller gives the return data anywhere to land.
            mstore(0x30fe0, 0)
            revert(0, 0x31000)
        }
    }
}

/// @notice `GasBurner` for a call that carries calldata: it burns on `receive()` and on `fallback()`.
/// @dev A hook token's `transfer` calls its recipient with a selector, which `GasBurner`'s bare
/// `receive()` does not answer. Separate from `GasBurner` for the same reason `BloatingReceiver` is.
contract GasBurnerAny {
    receive() external payable {
        while (true) {}
    }

    fallback() external payable {
        while (true) {}
    }
}

/// @notice An ERC-20 whose `transfer` makes one caller-chosen call into the distribution before it
/// moves the balance — the re-entry a hook token gives a beneficiary, pointed wherever a test needs.
/// @dev `HookToken` carries the two arms t02 needed and is deployed by two tests whose gas rows would
/// move if it grew, so the `applyQueued` and `propose` re-entries of F1 live here instead. The
/// callback's outcome is recorded rather than bubbled, exactly as `HookToken` does it: the outer
/// `distribute` then takes its success path and the test reads the refusal out of `hookData`.
///
/// The action fires on the **first** `transfer` only. `distribute` calls `transfer` once per row, so
/// an unguarded hook would run again on the second row and overwrite `hookOk`/`hookData` with the
/// outcome of a re-entry whose target state the first one had already consumed — on `ede55c3` the
/// first `applyQueued` succeeds and the second reports `NotReady(0)`, which reads as a refusal
/// without being one. One attempt per payout is also the shape leg 2's PoC had.
contract CallbackToken {
    error InsufficientBalance();

    bool public hookOk;
    bytes public hookData;
    bool public fired;

    /// @dev What `transfer` calls the target with. Set after deployment, because an `applyQueued`
    /// action's hash depends on a nonce the queue hands out after the table naming this token exists.
    bytes public action;

    mapping(address => uint256) public balanceOf;

    address private immutable target;

    constructor(address target_) {
        target = target_;
    }

    function setAction(bytes calldata action_) external {
        action = action_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (!fired) {
            fired = true;
            (hookOk, hookData) = target.call(action);
        }

        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice An ERC-20 whose `transfer` hands the recipient every unit of gas it has left before moving
/// the balance — the shape F8 sizes, where a beneficiary burns 63/64 of the frame.
/// @dev The ERC-20 branch of `_push` passes no gas, so the whole remaining frame reaches `transfer`
/// and from there the row. The call's outcome is ignored: a burner recipient leaves the 1/64 the
/// caller keeps, and what F8 measures is whether that remainder can pay the rows after it.
contract HookRecipientToken {
    error InsufficientBalance();

    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        // Deliberately unchecked and deliberately uncapped: `to` is given everything this frame has.
        (bool ok,) = to.call("");
        ok;

        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice An ETH beneficiary that reverts with a raw payload over the word `release` sorts by, so
/// decision 24's "bubble a real reason" can be proved still to hold on the ETH path after F6.
/// @dev `RevertingToken.Fail.WithRawBytes`' shape, on a `receive()` rather than a `transfer`: 33
/// bytes of `0xab`, the first length that must bubble rather than be named `ReleaseFailed`.
contract RawRevertReceiver {
    /// @dev How many bytes to revert with. 33 by default, the first length that must bubble.
    uint256 public revertBytes = 33;

    function setRevertBytes(uint256 revertBytes_) external {
        revertBytes = revertBytes_;
    }

    /// @dev Exactly what `receive()` will revert with, so a test can compare byte for byte rather
    /// than keep a second copy of the literal.
    function rawRevertData() public view returns (bytes memory data) {
        data = new bytes(revertBytes);
        for (uint256 i; i < data.length; ++i) {
            data[i] = 0xab;
        }
    }

    receive() external payable {
        bytes memory raw = rawRevertData();
        assembly ("memory-safe") {
            revert(add(raw, 0x20), mload(raw))
        }
    }
}

/// @notice A beneficiary that calls back into `distribute` while it is running.
contract ReentrantDistributor {
    Distribution private immutable target;

    constructor(Distribution target_) {
        target = target_;
    }

    receive() external payable {
        target.distribute(address(0));
    }
}

/// @notice A beneficiary that calls back into `release` while `distribute` is running.
contract ReentrantReleaser {
    Distribution private immutable target;

    constructor(Distribution target_) {
        target = target_;
    }

    receive() external payable {
        target.release(address(0), address(this));
    }
}

/// @notice An ERC-20 whose `transfer` re-enters the distribution before it moves the balance, so the
/// lock is proved against a token with hooks and not only against an ETH recipient (#21).
/// @dev The callback's outcome is recorded rather than bubbled: the outer `distribute` then takes its
/// success path, and the test reads the lock straight out of `hookData`.
contract HookToken {
    enum Hook {
        Distribute,
        Release
    }

    error InsufficientBalance();

    bool public hookOk;
    bytes public hookData;

    mapping(address => uint256) public balanceOf;

    Distribution private immutable target;
    Hook private immutable hook;

    constructor(Distribution target_, Hook hook_) {
        target = target_;
        hook = hook_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        bytes memory action = hook == Hook.Distribute
            ? abi.encodeCall(Distribution.distribute, (address(this)))
            : abi.encodeCall(Distribution.release, (address(this), to));
        (hookOk, hookData) = address(target).call(action);

        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice Sends ETH with `transfer`, which forwards only the 2,300-gas stipend.
contract PlainSender {
    function send(address to, uint256 amount) external {
        payable(to).transfer(amount);
    }

    receive() external payable {}
}

/// @notice ERC-20 with the three return shapes a real token can have on `transfer`.
contract MockERC20 {
    /// @dev `None` is mainnet USDT: it moves the balance and returns no data at all. `False` reports
    /// failure, so it must not move the balance either. The two *revert* shapes `release` sorts by
    /// live in `RevertingToken` rather than here, so that this contract's bytecode — and with it the
    /// gas of every test that deploys one — does not move when they change.
    enum Ret {
        True,
        None,
        False
    }

    error InsufficientBalance();

    Ret public immutable ret;

    mapping(address => uint256) public balanceOf;

    constructor(Ret ret_) {
        ret = ret_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (ret == Ret.False) return false;
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        if (ret == Ret.None) {
            assembly ("memory-safe") {
                return(0, 0)
            }
        }
        return true;
    }
}

/// @notice A token whose `transfer` fails with revert *data*, on either side of the threshold
/// `release` sorts failures by: a word or less is named `ReleaseFailed(token)`, anything longer is
/// bubbled with its own reason.
/// @dev Separate from `MockERC20` on purpose. `test_usdtStyleNoReturnToken` deploys two of those, so
/// growing that contract moved an M01 definition-of-done row by 260,510 gas for reasons having
/// nothing to do with it — noise that would mask a real regression later.
///
/// `MockERC20.InsufficientBalance()` is no use for the bubbled side: an argument-less custom error
/// is 4 bytes, so by the rule it is named, not bubbled. That is why the long case needs a string.
contract RevertingToken {
    enum Fail {
        WithString,
        WithRawBytes
    }

    /// @dev The reason `WithString` fails with. `Error(string)` wraps it to 100 bytes, over the
    /// threshold, so `release` must bubble it. Readable so a test can assert on the reason it will
    /// actually be given rather than on a second copy of this literal.
    string public constant REASON = "insufficient";

    Fail public immutable fail;

    /// @dev How many bytes `WithRawBytes` reverts with. 33 by default, the first length that must
    /// bubble; set it to 32 for the longest payload that must be named instead.
    uint256 public revertBytes = 33;

    constructor(Fail fail_) {
        fail = fail_;
    }

    function setRevertBytes(uint256 revertBytes_) external {
        revertBytes = revertBytes_;
    }

    /// @dev Exactly what `WithRawBytes` will revert with: `revertBytes` bytes of `0xab`. No selector
    /// and no decodable reason, so nothing but its length can decide how `release` treats it — which
    /// is the point, and why a test can compare against it byte for byte.
    function rawRevertData() public view returns (bytes memory data) {
        data = new bytes(revertBytes);
        for (uint256 i; i < data.length; ++i) {
            data[i] = 0xab;
        }
    }

    /// @dev `distribute` reads `balanceOf(this)` through `_balance` before it pushes anything, so a
    /// token that only knows how to fail still has to hold a balance to fail over.
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address, uint256) external view returns (bool) {
        if (fail == Fail.WithString) revert(REASON);
        bytes memory raw = rawRevertData();
        assembly ("memory-safe") {
            revert(add(raw, 0x20), mload(raw))
        }
    }
}

/// @notice `MockERC20` that answers `decimals()` with 6, for the dapp's by-decimals amounts (#43).
/// @dev The base mock deliberately has no `decimals()`, so its rows must render in raw units; this
/// subclass is the chain-side foil for that. No test exercises it.
contract MockERC20Dec6 is MockERC20 {
    constructor(Ret ret_) MockERC20(ret_) {}

    function decimals() external pure returns (uint8) {
        return 6;
    }
}

/// @notice Enough of a multisig to answer the dapp's owner probe: `isOwner(address)` is the one call
/// decision 7 makes, and a distribution owned by this contract renders the owner view with
/// copy-calldata for every signer it names.
contract MockVault {
    address public immutable signer;

    constructor(address signer_) {
        signer = signer_;
    }

    function isOwner(address account) external view returns (bool) {
        return account == signer;
    }
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 id, bytes calldata data) external returns (bytes4);
}

/// @notice Enough ERC-721 to prove a safe transfer into a contract with no receiver shim reverts.
contract MockERC721 {
    error NotOwner();
    error BadReceiver();

    mapping(uint256 => address) public ownerOf;

    function mint(address to, uint256 id) external {
        ownerOf[id] = to;
    }

    function safeTransferFrom(address from, address to, uint256 id) external {
        if (ownerOf[id] != from) revert NotOwner();
        ownerOf[id] = to;
        if (to.code.length != 0) {
            bytes4 answer = IERC721Receiver(to).onERC721Received(msg.sender, from, id, "");
            if (answer != IERC721Receiver.onERC721Received.selector) revert BadReceiver();
        }
    }
}

/// @notice A token as the dapp meets one on a real chain: `symbol()`, `decimals()` and `Transfer`
/// events, which the funds block's token-in scan reads. For hand testing on anvil; no test uses it.
contract DevToken {
    event Transfer(address indexed from, address indexed to, uint256 value);

    string public symbol;
    uint8 public immutable decimals;
    mapping(address => uint256) public balanceOf;

    constructor(string memory symbol_, uint8 decimals_) {
        symbol = symbol_;
        decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}

/// @notice A beneficiary that accepts ETH only when handed far more gas than `PUSH_GAS` forwards, so
/// an escrow it is owed can never be pushed to it and `claim` is its only exit (F5, [#95]).
/// @dev The `receive()` writes one storage slot 600 times: the first write to a zero slot costs
/// 20,000 and each dirty rewrite 100, so the frame needs more than the 100,000 the push forwards.
/// `release` therefore fails at *any* outer gas limit — the cap is on the gas forwarded, not on the
/// limit the caller sets — which is the whole of F5. `take` is how the account calls `claim` for
/// itself: the cap is gone, so the same `receive()` that cannot be pushed to can be paid.
/// Its own contract rather than an arm on `GasBurner`: that one is etched at every row of four
/// tables by `TableCap.t.sol`, so growing it would move every figure in that file.
contract HungryReceiver {
    uint256 public sink;

    function take(Distribution d, address token, address to) external {
        d.claim(token, to);
    }

    receive() external payable {
        for (uint256 i; i < 600; ++i) {
            sink = i; // 600 iterations: well over the 100,000-gas push cap
        }
    }
}

/// @notice An ERC-20 that refuses exactly one recipient — the issuer-blocklist shape F5's second
/// mechanism names (USDC, USDT) — so a row can be escrowed by the token's own refusal and then
/// claimed to an address the token does not refuse.
/// @dev Its own contract rather than a fourth `MockERC20.Ret` arm, for the reason `RevertingToken`'s
/// docstring gives: `test_usdtStyleNoReturnToken` deploys two `MockERC20`s, so growing that contract
/// moved an unrelated M01 row by 260,510 gas. `Blocked(address)` is 36 bytes of revert data, over the
/// word `release` and `claim` sort failures by, which is why the blocked push bubbles rather than
/// being named — in `distribute` it is escrowed either way.
contract BlocklistToken {
    error Blocked(address account);

    address public immutable blocked;

    mapping(address => uint256) public balanceOf;

    constructor(address blocked_) {
        blocked = blocked_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == blocked) revert Blocked(to);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice An escrowed account whose `receive()` re-enters `claim`, so the shared transient lock is
/// proved to refuse a second money path from inside the first.
/// @dev The re-entry's reason is propagated, not recorded: that is what makes the push fail during
/// `distribute` (so there is an escrow to claim at all) and what the outer `claim` then sorts by
/// decision 24. `CallbackToken` is the recording half, for reading the reason byte for byte.
contract ReentrantClaimer {
    Distribution private immutable target;

    constructor(Distribution target_) {
        target = target_;
    }

    function take(address token, address to) external {
        target.claim(token, to);
    }

    receive() external payable {
        target.claim(address(0), address(this));
    }
}

/// @notice An owner contract that re-tables to itself and distributes in one transaction — the
/// atomic sweep a zero delay allows, which `docs/brainstorming/PROJECT_OVERVIEW.md` § 5 decides is
/// allowed and the UI flags (#133 item 3, rejected as a contract change).
contract SweepingOwner {
    function sweep(Distribution d) external {
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](1);
        t[0] = Distribution.Beneficiary(address(this), 10_000, "name", "note");
        d.propose(abi.encodeCall(Distribution.setBeneficiaries, (t)));
        d.distribute(address(0));
    }

    receive() external payable {}
}

/// @notice ERC-721-shaped: `balanceOf` and `transferFrom`, and no `transfer` at all, so every push
/// fails and `distribute` escrows a *count* of NFTs as if it were an amount (F4's decision 23).
contract PlainNFT {
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public ownerOf;

    function mint(address to, uint256 id) external {
        ownerOf[id] = to;
        balanceOf[to]++;
    }

    function transferFrom(address from, address to, uint256 id) external {
        require(ownerOf[id] == from);
        ownerOf[id] = to;
        balanceOf[from]--;
        balanceOf[to]++;
    }
}

/// @notice An ERC-20 that can hold a balance large enough to overflow the share arithmetic, so the
/// accepted edge above 2²⁵⁶ ÷ `bps` can be pinned (#133 item 5, unchanged).
contract BigToken {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice A token whose `balanceOf` itself reverts with a reason, so the bubble in `_balance` —
/// which runs before anything is pushed — has something to carry.
/// @dev Its own contract rather than another `Fail` arm on `RevertingToken`: that mock is shared by
/// a dozen cases, and growing a shared mock moves the gas rows of tests that never asked for it.
/// `transfer` is unreachable here, because `distribute` reads the balance before it pushes.
contract BalanceRevertingToken {
    /// @dev `Error(string)` wraps this to 100 bytes. Readable so a test asserts on the reason it
    /// will actually be given rather than on a second copy of the literal.
    string public constant REASON = "balanceOf is not for you";

    function balanceOf(address) external pure returns (uint256) {
        revert(REASON);
    }

    function transfer(address, uint256) external pure returns (bool) {
        return true;
    }
}

/// @notice A token that reads the distributor's own views *inside* its `distribute` frame and records
/// what it saw, one entry per row it is asked to pay.
/// @dev The vehicle [#293](https://github.com/dnznlabs/rake/issues/293) asks for. It works because
/// the ERC-20 push carries no `PUSH_GAS` cap (`src/Distribution.sol:417`), unlike the ETH one, so a
/// callback here has the gas to copy a whole `snapshot()` — description, table and queue — into
/// memory. `refuse` makes one row's push fail, which is what writes an escrow mid-loop and gives the
/// later rows something partially written to see.
contract ViewReadingToken {
    error InsufficientBalance();
    error Refused();

    mapping(address => uint256) public balanceOf;

    /// @dev The distribution to read. Set after `create`, since its address is not known before.
    Distribution public watched;
    /// @dev The one row whose push reverts, or `address(0)` for none.
    address public refuse;

    // What each surviving callback saw, in row order.
    uint256[] public reservedSeen;
    uint256[] public watchedBalanceSeen;
    uint32[] public nonceSeen;
    uint32[] public delaySeen;
    address[] public ownerSeen;
    uint256[] public pendingLengthSeen;
    bytes32[] public beneficiariesHashSeen;
    bytes32[] public snapshotTableHashSeen;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function watch(Distribution watched_) external {
        watched = watched_;
    }

    function setRefuse(address refuse_) external {
        refuse = refuse_;
    }

    function seen() external view returns (uint256) {
        return reservedSeen.length;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (address(watched) != address(0)) {
            Distribution.Snapshot memory s = watched.snapshot();
            Distribution.Beneficiary[] memory t = watched.beneficiaries();
            reservedSeen.push(watched.reserved(address(this)));
            watchedBalanceSeen.push(balanceOf[address(watched)]);
            nonceSeen.push(s.nonce);
            delaySeen.push(s.delay);
            ownerSeen.push(s.owner);
            pendingLengthSeen.push(s.pending.length);
            beneficiariesHashSeen.push(keccak256(abi.encode(t)));
            snapshotTableHashSeen.push(keccak256(abi.encode(s.table)));
        }
        // After the reads, so that a refusing row's own observation is rolled back with its revert —
        // which is itself part of what the test pins.
        if (to == refuse) revert Refused();
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
