// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, stdError} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Distribution, DistributionFactory} from "../src/Distribution.sol";
import {
    BigToken,
    BlocklistToken,
    BloatingReceiver,
    CallbackToken,
    GasBurnerAny,
    HookRecipientToken,
    HookToken,
    HungryReceiver,
    MockERC20,
    MockERC721,
    PlainNFT,
    PlainSender,
    RawRevertReceiver,
    ReentrantClaimer,
    ReentrantDistributor,
    ReentrantReleaser,
    RevertingReceiver,
    RevertingToken,
    SweepingOwner
} from "./mocks/Mocks.sol";

/// @dev Every case runs against a clone the factory deployed, because `receive()` rejects ETH on the
/// implementation and `init` is callable only by whoever deployed it. The factory is the only way to
/// reach a live clone; `impl` is the implementation it holds.
contract DistributionTest is Test {
    DistributionFactory internal factory;
    Distribution internal impl;
    PlainSender internal sender;

    /// @dev Feeds `_salt()`'s low 12 bytes, so every clone lands at an address nobody has to predict.
    uint96 internal salts;

    address internal constant OWNER = address(0xB0B);
    address internal constant STRANGER = address(0x5EE);
    address internal constant A = address(0x1001);
    address internal constant B = address(0x1002);
    address internal constant C = address(0x1003);

    uint32 internal constant WEEK = 7 days;

    /// @dev `uint96` to match `Beneficiary.bps`, so `_capTable` divides a table up in that type.
    uint96 internal constant BPS_TOTAL = 10_000;

    /// @dev Where `_capTable`'s rows start: clear of the precompiles, and clear of `A`/`B`/`C` so a
    /// cap-length table cannot collide with the addresses the rest of the suite pays.
    uint160 internal constant FIRST_CAP_ROW = 0x20000;

    /// @dev Disjoint ranges for the two tables of etched rows F6 and F8 need, kept clear of
    /// `FIRST_CAP_ROW`'s cap-length run so no row of one table is warm from another's.
    uint160 internal constant FIRST_BLOAT_ROW = 0x30000;
    uint160 internal constant FIRST_STARVE_ROW = 0x40000;

    /// @dev F8's measurement: the first round thousand of gas at which a `distribute` over a
    /// hook-recipient table completes. Bisected by hand, one limit per transaction.
    /// @dev Bytecode-dependent, so it is re-bisected whenever `Distribution` moves: m03-t08's
    /// `GRACE`/`claim` changes added 542 bytes of deployed code and moved it from **95,049,000** to
    /// **95,237,000** (+188,000) — the implementation the clone delegates into is bigger, so every
    /// row of the table costs a little more to pay. The compiler moves it too: the solc 0.8.34 →
    /// 0.8.38 bump (2026-11-16) took it from 95,237,000 to **95,226,000** (−11,000) with no `src/`
    /// change.
    uint256 internal constant F8_SUCCEEDS_AT = 95_226_000;

    /// @dev Hands each starvation attempt its own disjoint range of row addresses.
    uint160 internal starveRanges;

    function setUp() public {
        factory = new DistributionFactory();
        impl = Distribution(payable(factory.implementation()));
        sender = new PlainSender();
        vm.deal(address(sender), 1000 ether);
    }

    function test_rounding_3333_3333_3334() public {
        // Arrange
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = _row(A, 3333);
        t[1] = _row(B, 3333);
        t[2] = _row(C, 3334);
        Distribution d = _deploy(0, t);

        // Act
        _send(d, 10_000);
        d.distribute(address(0));

        // Assert
        assertEq(A.balance, 3333);
        assertEq(B.balance, 3333);
        assertEq(C.balance, 3334);
        assertEq(address(d).balance, 0, "nothing is left behind");

        // Act — one wei more, so the remainder is no longer the last row's bps share.
        _send(d, 10_001);
        d.distribute(address(0));

        // Assert
        assertEq(A.balance, 3333 + 3333);
        assertEq(B.balance, 3333 + 3333);
        assertEq(C.balance, 3334 + 3335, "the highest address absorbs the dust");
        assertEq(address(d).balance, 0);
    }

    function test_escrowRevertingEthRecipientOthersPaid() public {
        // Arrange
        RevertingReceiver bad = new RevertingReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = _row(address(bad), 5000);
        t[1] = _row(A, 2500);
        t[2] = _row(B, 2500);
        Distribution d = _deploy(0, _asc(t));
        _send(d, 10_000);

        // Act
        vm.expectEmit(true, true, false, true, address(d));
        emit Distribution.Escrowed(address(0), address(bad), 5000);
        d.distribute(address(0));

        // Assert
        assertEq(A.balance, 2500, "the other rows are paid");
        assertEq(B.balance, 2500);
        assertEq(address(bad).balance, 0);
        assertEq(d.escrowed(address(0), address(bad)), 5000);
        assertEq(d.reserved(address(0)), 5000);
        assertEq(address(d).balance, 5000, "the escrow stays in the contract");
    }

    function test_distributeReleaseDistributeKeepsReserved() public {
        // Arrange
        RevertingReceiver bad = new RevertingReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = _row(address(bad), 5000);
        t[1] = _row(A, 2500);
        t[2] = _row(B, 2500);
        Distribution d = _deploy(0, _asc(t));
        _send(d, 10_000);
        d.distribute(address(0));
        assertEq(d.reserved(address(0)), 5000);

        // Act — a second split divides `balance − reserved`, not the whole balance.
        _send(d, 10_000);
        d.distribute(address(0));

        // Assert
        assertEq(A.balance, 5000, "2,500 out of each 10,000, not out of 15,000");
        assertEq(B.balance, 5000);
        assertEq(d.escrowed(address(0), address(bad)), 10_000);
        assertEq(d.reserved(address(0)), 10_000);
        assertEq(address(d).balance, 10_000);

        // Act — release once the recipient accepts.
        bad.setAccepting(true);
        vm.expectEmit(true, true, false, true, address(d));
        emit Distribution.Released(address(0), address(bad), 10_000);
        d.release(address(0), address(bad));

        // Assert
        assertEq(address(bad).balance, 10_000, "the recipient holds its share");
        assertEq(d.escrowed(address(0), address(bad)), 0);
        assertEq(d.reserved(address(0)), 0);
        assertEq(address(d).balance, 0);

        // Act — the third split has nothing reserved, so it divides the whole balance.
        _send(d, 10_000);
        d.distribute(address(0));

        // Assert
        assertEq(address(bad).balance, 15_000);
        assertEq(A.balance, 7500);
        assertEq(B.balance, 7500);
        assertEq(address(d).balance, 0);
    }

    function test_cancelThenApplyReverts() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory action = abi.encodeCall(Distribution.setDescription, ("changed"));
        vm.prank(OWNER);
        bytes32 hash = d.propose(action);

        // Act
        vm.prank(OWNER);
        d.cancel(hash);
        vm.warp(block.timestamp + WEEK + 1);

        // Assert
        vm.expectRevert(abi.encodeWithSelector(Distribution.NotReady.selector, 0));
        d.applyQueued(action, 1);
        assertEq(d.snapshot().pending.length, 0);
        assertEq(d.description(), "desc", "unchanged");
    }

    /// @notice F9/F13, decision 39: a matured action is applicable for `GRACE` after its eta and no
    /// longer. The boundary instant itself still applies — the window is closed above it, not at it.
    function test_applyQueuedExpires() public {
        // Arrange — two actions on one clone, so the same eta can be met and then missed.
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory inside = abi.encodeCall(Distribution.setDescription, ("inside"));
        bytes memory outside = abi.encodeCall(Distribution.setDescription, ("outside"));
        vm.startPrank(OWNER);
        d.propose(inside);
        d.propose(outside);
        vm.stopPrank();
        uint256 eta = block.timestamp + WEEK;

        // Act / assert — the last applicable instant.
        vm.warp(eta + d.GRACE());
        d.applyQueued(inside, 1);
        assertEq(d.description(), "inside", "eta + GRACE is still inside the window");

        // And one second past it.
        vm.warp(eta + d.GRACE() + 1);
        vm.expectRevert(abi.encodeWithSelector(Distribution.Expired.selector, eta));
        d.applyQueued(outside, 2);
        assertEq(d.description(), "inside", "the expired action changed nothing");
        assertEq(d.queued(keccak256(abi.encode(outside, uint32(2)))), eta, "and it is still queued");
    }

    /// @notice F13, decision 39: once the window has passed the entry is nobody's option to hold, so
    /// anyone may drop it — which is also what makes a renounced contract's queue cleanable.
    function test_strangerCancelsExpired() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory action = abi.encodeCall(Distribution.setDescription, ("changed"));
        vm.prank(OWNER);
        bytes32 hash = d.propose(action);
        uint256 eta = block.timestamp + WEEK;

        // Act
        vm.warp(eta + d.GRACE() + 1);
        vm.expectEmit(true, false, false, true, address(d));
        emit Distribution.Cancelled(hash);
        vm.prank(STRANGER);
        d.cancel(hash);

        // Assert
        assertEq(d.queued(hash), 0, "the entry is gone");
        assertEq(d.pendingCount(), 0);
        assertEq(d.description(), "desc", "and cancelling is not applying");
    }

    /// @notice The regression guard for the order of `cancel`'s two checks. A stranger must see
    /// `NotOwner` — not `NothingToDo` — for anything that is not an expired entry, at every instant
    /// up to and including the boundary, while the owner's `cancel` works at all of them.
    function test_strangerCannotCancelUnexpired() public {
        Distribution d = _deploy(WEEK, _defaultTable());
        uint256 start = block.timestamp;
        uint256 eta = start + WEEK;

        // All three entries are proposed at the same instant, so all three share one eta — proposing
        // inside the loop below would date each one from the instant the previous iteration warped to.
        bytes32[3] memory hashes;
        for (uint256 i; i < hashes.length; ++i) {
            vm.prank(OWNER);
            hashes[i] = d.propose(abi.encodeCall(Distribution.setDescription, (vm.toString(i))));
        }

        // Before the eta, at the eta, and at exactly eta + GRACE: three instants, each proved twice —
        // refused for the stranger, allowed for the owner — on its own entry, since the owner's
        // cancel consumes one.
        uint256[3] memory instants = [start, eta, eta + d.GRACE()];
        for (uint256 i; i < instants.length; ++i) {
            vm.warp(instants[i]);
            vm.prank(STRANGER);
            vm.expectRevert(Distribution.NotOwner.selector);
            d.cancel(hashes[i]);
            assertEq(d.queued(hashes[i]), eta, "the stranger changed nothing");

            vm.prank(OWNER);
            d.cancel(hashes[i]);
            assertEq(d.queued(hashes[i]), 0, "the owner may cancel at the same instant");
        }

        // A stranger's cancel of an entry that never existed is `NotOwner` too, not `NothingToDo`:
        // `test_renounceFreezes` asserts exactly this for a renounced owner.
        vm.prank(STRANGER);
        vm.expectRevert(Distribution.NotOwner.selector);
        d.cancel(bytes32(0));
    }

    /// @notice F13's concrete cost, which is #133's `test_staleMaturedActionResurrects` inverted: a
    /// beneficiary removed by a newer table could apply the older one it was still listed in, months
    /// later, and then `distribute`. Past the window that action is dead.
    function test_staleActionExpires() public {
        // Arrange — two tables queued, the newer applied first.
        Distribution d = _deploy(WEEK, _defaultTable());
        Distribution.Beneficiary[] memory older = new Distribution.Beneficiary[](1);
        older[0] = _row(C, 10_000);
        Distribution.Beneficiary[] memory newer = new Distribution.Beneficiary[](1);
        newer[0] = _row(B, 10_000);
        bytes memory x = abi.encodeCall(Distribution.setBeneficiaries, (older));
        bytes memory y = abi.encodeCall(Distribution.setBeneficiaries, (newer));
        vm.startPrank(OWNER);
        d.propose(x); // nonce 1
        d.propose(y); // nonce 2
        vm.stopPrank();
        uint256 eta = block.timestamp + WEEK;

        // Act
        vm.warp(eta);
        d.applyQueued(y, 2);
        assertEq(d.beneficiaries()[0].account, B, "the newer table is live");

        // Assert — 180 days on, the older action is not a standing option any caller may take.
        vm.warp(eta + 180 days);
        vm.prank(STRANGER);
        vm.expectRevert(abi.encodeWithSelector(Distribution.Expired.selector, eta));
        d.applyQueued(x, 1);
        assertEq(d.beneficiaries()[0].account, B, "and the table did not revert to the older one");
        assertEq(d.beneficiaries().length, 1);
    }

    function test_setDelayZeroDoesNotShortcutQueued() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        Distribution.Beneficiary[] memory next = new Distribution.Beneficiary[](2);
        next[0] = _row(A, 5000);
        next[1] = _row(C, 5000);
        bytes memory actionA = abi.encodeCall(Distribution.setBeneficiaries, (next));
        bytes memory actionB = abi.encodeCall(Distribution.setDelay, (0));

        // Act
        vm.prank(OWNER);
        bytes32 hashA = d.propose(actionA);
        uint256 etaA = d.queued(hashA);
        vm.warp(block.timestamp + 1 days);
        vm.prank(OWNER);
        bytes32 hashB = d.propose(actionB);
        uint256 etaB = d.queued(hashB);

        // Assert — B took the live delay rather than applying itself inline.
        assertEq(d.delay(), WEEK);
        assertEq(d.pendingCount(), 2);
        assertEq(etaB, block.timestamp + WEEK);
        assertEq(d.queued(hashA), etaA, "A's eta is untouched");

        vm.expectRevert(abi.encodeWithSelector(Distribution.NotReady.selector, etaA));
        d.applyQueued(actionA, 1);
        vm.expectRevert(abi.encodeWithSelector(Distribution.NotReady.selector, etaB));
        d.applyQueued(actionB, 2);

        vm.warp(etaA);
        d.applyQueued(actionA, 1);
        assertEq(d.delay(), WEEK, "still the old delay until B applies");

        vm.warp(etaB);
        d.applyQueued(actionB, 2);
        assertEq(d.delay(), 0);
        assertEq(d.pendingCount(), 0);
    }

    function test_usdtStyleNoReturnToken() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        MockERC20 silent = new MockERC20(MockERC20.Ret.None);
        MockERC20 liar = new MockERC20(MockERC20.Ret.False);
        silent.mint(address(d), 10_000);
        liar.mint(address(d), 10_000);

        // Act
        d.distribute(address(silent));
        d.distribute(address(liar));

        // Assert
        assertEq(silent.balanceOf(A), 6000, "a no-return token pays every row");
        assertEq(silent.balanceOf(B), 4000);
        assertEq(silent.balanceOf(address(d)), 0);
        assertEq(d.reserved(address(silent)), 0);

        assertEq(liar.balanceOf(A), 0, "a false-returning token pays nobody");
        assertEq(liar.balanceOf(B), 0);
        assertEq(d.escrowed(address(liar), A), 6000);
        assertEq(d.escrowed(address(liar), B), 4000);
        assertEq(d.reserved(address(liar)), 10_000);
        assertEq(liar.balanceOf(address(d)), d.reserved(address(liar)));
    }

    function test_reentrantRecipientIsEscrowed() public {
        // Arrange — the mocks need the clone's address before it exists, so the salt is picked first.
        bytes32 salt = _salt();
        Distribution d = Distribution(payable(factory.predict(salt)));
        ReentrantDistributor viaDistribute = new ReentrantDistributor(d);
        ReentrantReleaser viaRelease = new ReentrantReleaser(d);
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = _row(address(viaDistribute), 3000);
        t[1] = _row(address(viaRelease), 3000);
        t[2] = _row(A, 4000);
        address created = factory.create(OWNER, 0, "desc", _asc(t), salt);
        assertEq(created, address(d), "the clone landed where predict() said it would");
        _send(d, 10_000);

        // Act
        d.distribute(address(0));

        // Assert
        assertEq(address(viaDistribute).balance, 0, "the reentrant distribute push failed");
        assertEq(address(viaRelease).balance, 0, "the reentrant release push failed");
        assertEq(d.escrowed(address(0), address(viaDistribute)), 3000);
        assertEq(d.escrowed(address(0), address(viaRelease)), 3000);
        assertEq(A.balance, 4000, "the other row is paid");
        assertEq(d.reserved(address(0)), 6000);
        assertEq(address(d).balance, d.reserved(address(0)));
    }

    /// @dev The ETH cases above prove the lock against a recipient's `receive`. A token's `transfer`
    /// is the other way in, and it is not gas-capped the way an ETH push is, so the hook has room to
    /// try anything: #21 asks for that half.
    function test_hookTokenDistributeIsLocked() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        HookToken tk = new HookToken(d, HookToken.Hook.Distribute);
        tk.mint(address(d), 10_000);

        // Act
        d.distribute(address(tk));

        // Assert — the hook got in and was turned away by the lock, not by anything else.
        assertFalse(tk.hookOk(), "the reentrant distribute failed");
        assertEq(tk.hookData(), abi.encodeWithSelector(Distribution.Locked.selector), "and failed on the lock");

        // And the outer distribute took its success path regardless.
        assertEq(tk.balanceOf(A), 6000, "every row is paid");
        assertEq(tk.balanceOf(B), 4000);
        assertEq(d.reserved(address(tk)), 0, "so nothing is escrowed");
    }

    /// @dev `release` cannot be entered from a hook token on its own terms: there is no escrow to
    /// release until a push has failed, and a token that returns `true` never fails one. So the
    /// release-selector callback raised from inside `distribute` is what proves the lock covers it.
    function test_hookTokenReleaseIsLocked() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        HookToken tk = new HookToken(d, HookToken.Hook.Release);
        tk.mint(address(d), 10_000);

        // Act
        d.distribute(address(tk));

        // Assert — the lock answers before `release` can look for an escrow.
        assertFalse(tk.hookOk(), "the reentrant release failed");
        assertEq(tk.hookData(), abi.encodeWithSelector(Distribution.Locked.selector), "and failed on the lock");
        assertEq(tk.balanceOf(A), 6000, "every row is paid");
        assertEq(tk.balanceOf(B), 4000);
        assertEq(d.reserved(address(tk)), 0, "so nothing is escrowed");
    }

    /// @notice The **warm** case only, and deliberately so: the clone is deployed inside the test, so
    /// the implementation it delegates into is already warm when the ETH arrives and 1,659 gas of the
    /// 2,300 stipend is enough. Cold it needs 4,159 and this same `transfer` reverts — #174, measured
    /// and pinned from both sides in `test/ColdStipend.t.sol`, which creates its clone in `setUp` to
    /// get a genuinely cold first touch. Read the two together; neither says what the other does.
    function test_receiveUnderStipend() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());

        // Act — `transfer` forwards the 2,300-gas stipend and nothing else.
        vm.expectEmit(true, false, false, true, address(d));
        emit Distribution.Received(address(sender), 1 ether);
        sender.send(address(d), 1 ether);

        // Assert
        assertEq(address(d).balance, 1 ether);
    }

    function test_implementationRejectsEth() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        vm.deal(address(this), 1 ether);

        // Act
        (bool implOk,) = payable(address(impl)).call{value: 1}("");
        (bool cloneOk,) = payable(address(d)).call{value: 1}("");

        // Assert
        assertFalse(implOk, "the implementation refuses ETH");
        assertTrue(cloneOk, "a clone accepts it");
    }

    function test_initOnlyFactoryAndOnce() public {
        // Arrange — `create` is the only path to a live clone, and it inits on the way.
        Distribution d = _deploy(0, _defaultTable());
        Distribution.Beneficiary[] memory t = _defaultTable();

        // Act / assert
        vm.prank(STRANGER);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.init(OWNER, 0, "desc", t);

        vm.prank(address(factory));
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.init(OWNER, 0, "desc", t);
    }

    function test_tableValidation() public {
        Distribution.Beneficiary[] memory empty = new Distribution.Beneficiary[](0);

        Distribution.Beneficiary[] memory zeroBps = new Distribution.Beneficiary[](2);
        zeroBps[0] = _row(A, 0);
        zeroBps[1] = _row(B, 10_000);

        Distribution.Beneficiary[] memory zeroAccount = new Distribution.Beneficiary[](2);
        zeroAccount[0] = _row(address(0), 5000);
        zeroAccount[1] = _row(B, 5000);

        Distribution.Beneficiary[] memory unsorted = new Distribution.Beneficiary[](2);
        unsorted[0] = _row(B, 6000);
        unsorted[1] = _row(A, 4000);

        Distribution.Beneficiary[] memory duplicate = new Distribution.Beneficiary[](2);
        duplicate[0] = _row(A, 5000);
        duplicate[1] = _row(A, 5000);

        Distribution.Beneficiary[] memory short = new Distribution.Beneficiary[](2);
        short[0] = _row(A, 5999);
        short[1] = _row(B, 4000);

        // Through init.
        _expectBadInit(empty);
        _expectBadInit(zeroBps);
        _expectBadInit(zeroAccount);
        _expectBadInit(unsorted);
        _expectBadInit(duplicate);
        _expectBadInit(short);

        // Through an applied setBeneficiaries, whose self-call revert is bubbled.
        Distribution d = _deploy(0, _defaultTable());
        _expectBadSet(d, empty);
        _expectBadSet(d, zeroBps);
        _expectBadSet(d, zeroAccount);
        _expectBadSet(d, unsorted);
        _expectBadSet(d, duplicate);
        _expectBadSet(d, short);
        assertEq(d.beneficiaries().length, 2, "the live table never changed");
    }

    function test_settersOnlySelf() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        Distribution.Beneficiary[] memory t = _defaultTable();

        // Act / assert — even the owner cannot reach them directly.
        vm.startPrank(OWNER);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.setBeneficiaries(t);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.setDescription("nope");
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.setDelay(1);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.transferOwnership(STRANGER);
        vm.stopPrank();
    }

    function test_delayZeroAppliesInline() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        bytes memory action = abi.encodeCall(Distribution.setDescription, ("inline"));

        // Act
        vm.recordLogs();
        vm.prank(OWNER);
        bytes32 hash = d.propose(action);

        // Assert
        assertEq(d.description(), "inline", "state moved in the proposing call");
        assertEq(d.pendingCount(), 0);
        assertEq(d.queued(hash), 0);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2);
        assertEq(logs[0].topics[0], Distribution.Queued.selector);
        assertEq(logs[0].topics[1], hash);
        assertEq(logs[1].topics[0], Distribution.Applied.selector);
        assertEq(logs[1].topics[1], hash);
    }

    function test_pendingIterable() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory a1 = abi.encodeCall(Distribution.setDescription, ("one"));
        bytes memory a2 = abi.encodeCall(Distribution.setDescription, ("two"));
        bytes memory a3 = abi.encodeCall(Distribution.setDescription, ("three"));

        vm.prank(OWNER);
        bytes32 h1 = d.propose(a1);
        uint256 e1 = d.queued(h1);
        vm.warp(block.timestamp + 1);
        vm.prank(OWNER);
        bytes32 h2 = d.propose(a2);
        vm.warp(block.timestamp + 1);
        vm.prank(OWNER);
        bytes32 h3 = d.propose(a3);
        uint256 e3 = d.queued(h3);

        // Act — swap-and-pop moves the third row into the second slot.
        vm.prank(OWNER);
        d.cancel(h2);

        // Assert
        Distribution.Pending[] memory pending = d.snapshot().pending;
        assertEq(pending.length, 2);
        assertEq(pending[0].hash, h1);
        assertEq(pending[0].eta, e1);
        assertEq(pending[0].action, a1);
        assertEq(pending[1].hash, h3);
        assertEq(pending[1].eta, e3);
        assertEq(pending[1].action, a3);
    }

    function test_applyFailureKeepsQueued() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        Distribution.Beneficiary[] memory bad = new Distribution.Beneficiary[](1);
        bad[0] = _row(A, 9999);
        bytes memory action = abi.encodeCall(Distribution.setBeneficiaries, (bad));
        vm.prank(OWNER);
        bytes32 hash = d.propose(action);
        uint256 eta = d.queued(hash);

        // Act
        vm.warp(eta);
        vm.expectRevert(Distribution.BadTable.selector);
        d.applyQueued(action, 1);

        // Assert
        assertEq(d.queued(hash), eta, "the hash stays queued for a retry");
        assertEq(d.pendingCount(), 1);
    }

    /// @notice `create` accepts a zero `owner_` rather than refusing it, so a clone can be born in
    /// exactly the state `test_renounceFreezes` reaches by proposing it: ownerless from its first
    /// block. `propose` is the only thing that closes — `distribute`, `release` and `claim` stay
    /// permissionless forever — and the zero owner is on the `Created` log, which is where a deployer
    /// who left the field empty reads it. Nobody can impose the state on a stranger, because the
    /// salt's top 20 bytes must be `msg.sender`.
    /// @dev The counterpart of `test_renounceFreezes`: that one renounces a clone, this one is handed
    /// a clone already there, and the two must agree on what the state permits. Ruled on #173, which
    /// asked whether `create` should refuse it instead.
    function test_createAcceptsZeroOwnerBornRenounced() public {
        // Arrange — one row that refuses its push and one that burns past the cap, so `release` and
        // `claim` each have an escrow to move; `A` is paid by the split itself.
        RevertingReceiver bad = new RevertingReceiver();
        HungryReceiver hungry = new HungryReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = _row(address(bad), 4000);
        t[1] = _row(address(hungry), 4000);
        t[2] = _row(A, 2000);
        bytes32 salt = _salt();
        address predicted = factory.predict(salt);

        // Act — the create itself, with the zero owner in the log.
        vm.expectEmit(true, true, false, true, address(factory));
        emit DistributionFactory.Created(predicted, address(0));
        Distribution d = Distribution(payable(factory.create(address(0), 0, "desc", _asc(t), salt)));

        // Assert — created, at the predicted address, born in the state `owner()` calls renounced.
        assertEq(address(d), predicted, "the clone is where predict said");
        assertEq(d.owner(), address(0), "and it is born renounced");
        assertEq(d.pendingOwner(), address(0), "with no transfer pending to undo it");

        // Assert — `propose` is closed, to the creator and to a stranger alike.
        vm.expectRevert(Distribution.NotOwner.selector);
        d.propose(abi.encodeCall(Distribution.setDescription, ("mine")));
        vm.prank(STRANGER);
        vm.expectRevert(Distribution.NotOwner.selector);
        d.propose(abi.encodeCall(Distribution.setDescription, ("mine")));

        // Act — the permissionless half, from a stranger so no owner is implied anywhere in it.
        _send(d, 10_000);
        vm.prank(STRANGER);
        d.distribute(address(0));

        // Assert
        assertEq(A.balance, 2000, "the plain row is paid");
        assertEq(d.escrowed(address(0), address(bad)), 4000, "and the two failing rows are escrowed");
        assertEq(d.escrowed(address(0), address(hungry)), 4000);

        // Act — `release` retries one, the beneficiary `claim`s the other, neither needing an owner.
        bad.setAccepting(true);
        vm.prank(STRANGER);
        d.release(address(0), address(bad));
        hungry.take(d, address(0), C);

        // Assert
        assertEq(address(bad).balance, 4000, "the retried row is paid");
        assertEq(C.balance, 4000, "and the beneficiary's own escrow went where it said");
        assertEq(d.reserved(address(0)), 0);
        assertEq(address(d).balance, 0, "with nothing left behind and no owner at any point");
    }

    function test_renounceFreezes() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());

        // Act
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (address(0))));

        // Assert
        assertEq(d.owner(), address(0));

        vm.prank(OWNER);
        vm.expectRevert(Distribution.NotOwner.selector);
        d.propose(abi.encodeCall(Distribution.setDelay, (1)));

        vm.prank(OWNER);
        vm.expectRevert(Distribution.NotOwner.selector);
        d.cancel(bytes32(0));

        _send(d, 10_000);
        d.distribute(address(0));
        assertEq(A.balance, 6000, "distribute still works on a frozen table");
        assertEq(B.balance, 4000);
    }

    /// @notice #111's code half, from #136: a renounce is a state change with an owner, so it leaves
    /// the same trace a handover does. Ownable2Step's shape — `newOwner` is `address(0)`.
    function test_renounceEmitsOwnershipTransferred() public {
        // Arrange — a delay, so the renounce is applied rather than run inline, which is the path
        // a reader of the logs actually meets.
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory action = abi.encodeCall(Distribution.transferOwnership, (address(0)));
        vm.prank(OWNER);
        d.propose(action);
        vm.warp(block.timestamp + WEEK);

        // Act / assert
        vm.expectEmit(true, true, false, true, address(d));
        emit Distribution.OwnershipTransferred(OWNER, address(0));
        d.applyQueued(action, 1);

        assertEq(d.owner(), address(0), "and the renounce took effect");
    }

    /// @notice Naming a successor moves nothing on its own. The owner keeps every power until the
    /// successor turns up, which is the whole of what the two-step buys.
    function test_transferOwnershipIsPending() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());

        // Act
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (B)));

        // Assert
        assertEq(d.owner(), OWNER, "the live owner is untouched by the nomination");
        assertEq(d.pendingOwner(), B, "the successor is named and nothing more");
        // `Snapshot` has no `pendingOwner` field at all, so this reads the live owner by
        // construction — the assertion is that it is not quietly the nominee.
        assertEq(d.snapshot().owner, OWNER, "and the snapshot still reports the live owner");

        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.setDelay, (1)));
        assertEq(d.delay(), 1, "the owner still governs while a transfer is pending");
    }

    /// @notice The nominee's own call is what moves the ownership, and it moves all of it.
    function test_acceptOwnershipByPendingOwner() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (B)));

        // Act — the acceptance is the one ownership change with no `Queued`/`Applied` pair of its
        // own, so this event is the only trace a log reader gets (ruled in the #103 review).
        vm.expectEmit(true, true, false, true, address(d));
        emit Distribution.OwnershipTransferred(OWNER, B);
        vm.prank(B);
        d.acceptOwnership();

        // Assert
        assertEq(d.owner(), B);
        assertEq(d.pendingOwner(), address(0), "accepting consumes the nomination");

        vm.prank(OWNER);
        vm.expectRevert(Distribution.NotOwner.selector);
        d.propose(abi.encodeCall(Distribution.setDelay, (1)));

        vm.prank(B);
        d.propose(abi.encodeCall(Distribution.setDelay, (1)));
        assertEq(d.delay(), 1, "and the new owner has it instead");
    }

    /// @notice Only the nominee, and only while there is one: an unset `pendingOwner` is `address(0)`,
    /// which no caller can be, so a cleared nomination is not an open door.
    function test_acceptOwnershipByOtherReverts() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (B)));

        // Act / assert — a third party cannot take a nomination made to someone else.
        vm.prank(C);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.acceptOwnership();
        assertEq(d.owner(), OWNER, "the refused attempt moved nothing");
        assertEq(d.pendingOwner(), B);

        // Act / assert — and nobody can take one that was never made.
        Distribution fresh = _deploy(0, _defaultTable());
        assertEq(fresh.pendingOwner(), address(0), "a fresh clone names no successor");
        vm.prank(STRANGER);
        vm.expectRevert(Distribution.Unauthorized.selector);
        fresh.acceptOwnership();
    }

    /// @notice Renouncing stayed one step — `test_renounceFreezes` is the freeze itself — and it
    /// takes any pending nomination down with it, so a transfer in flight cannot outlive the owner.
    function test_renounceStillImmediateAndClearsPending() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (B)));
        assertEq(d.pendingOwner(), B);

        // Act
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (address(0))));

        // Assert
        assertEq(d.owner(), address(0), "renouncing is still immediate");
        assertEq(d.pendingOwner(), address(0), "and drops the pending transfer with it");

        vm.prank(B);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.acceptOwnership();
    }

    /// @notice Naming the current owner is how a nomination is withdrawn: it is the one `owner_` that
    /// cannot be a successor, so it means "nobody" without meaning `address(0)`, which renounces.
    function test_transferToCurrentOwnerWithdrawsPending() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (B)));
        assertEq(d.pendingOwner(), B);

        // Act
        vm.prank(OWNER);
        d.propose(abi.encodeCall(Distribution.transferOwnership, (OWNER)));

        // Assert
        assertEq(d.pendingOwner(), address(0), "the nomination is withdrawn");
        assertEq(d.owner(), OWNER, "and the owner is unchanged, not renounced");

        vm.prank(B);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.acceptOwnership();
    }

    /// @notice `cancel` reaches the queue, not the state. A nomination that has already been applied
    /// is live state, so cancelling a later queued transfer leaves it exactly where it was.
    function test_cancelQueuedTransferLeavesPendingOwner() public {
        // Arrange — a real delay, so the second transfer queues instead of running.
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory toB = abi.encodeCall(Distribution.transferOwnership, (B));
        vm.prank(OWNER);
        bytes32 hashB = d.propose(toB);
        vm.warp(d.queued(hashB));
        d.applyQueued(toB, 1);
        assertEq(d.pendingOwner(), B, "the first transfer applied");

        bytes memory toC = abi.encodeCall(Distribution.transferOwnership, (C));
        vm.prank(OWNER);
        bytes32 hashC = d.propose(toC);
        assertEq(d.pendingOwner(), B, "queueing the second one does not run it");

        // Act
        vm.prank(OWNER);
        d.cancel(hashC);

        // Assert
        assertEq(d.queued(hashC), 0, "the second transfer is off the queue");
        assertEq(d.pendingCount(), 0);
        assertEq(d.pendingOwner(), B, "and the applied nomination is untouched by the cancel");

        vm.prank(B);
        d.acceptOwnership();
        assertEq(d.owner(), B, "so B can still accept it");
    }

    /// @notice The cap is the contract's own `MAX_BENEFICIARIES`, measured against a table that is
    /// faultless apart from its length: ascending, no zero share, summing to exactly 10,000. So the
    /// `BadTable()` at one row more can only be the cap and not another rule tripping first.
    function test_tableCapBoundary() public {
        // Arrange
        uint256 cap = impl.MAX_BENEFICIARIES();

        // Act / assert — the longest table the contract accepts.
        Distribution d = _deploy(0, _capTable(cap));
        assertEq(d.beneficiaries().length, cap, "a table of exactly the cap goes in");
        assertEq(d.snapshot().table.length, cap);

        // Assert — one row more, by the same construction, breaks no other rule: asserted here
        // rather than assumed, so a `BadTable()` below cannot be a zero share or a bad ordering.
        Distribution.Beneficiary[] memory over = _capTable(cap + 1);
        uint96 sum;
        address prev;
        for (uint256 i; i < over.length; ++i) {
            assertGt(over[i].bps, 0, "no row of the over-cap table has a zero share");
            assertGt(uint160(over[i].account), uint160(prev), "and its accounts ascend");
            prev = over[i].account;
            sum += over[i].bps;
        }
        assertEq(sum, BPS_TOTAL, "and it sums to exactly 10,000");

        // Act / assert — so the length is the only thing left to reject it for.
        _expectBadInit(over);
    }

    /// @notice A token that answers a push with a bare `false` gives `release` a 32-byte word and no
    /// reason, so the failure is named rather than bubbled — and the escrow it was retrying survives.
    function test_releaseFailedNamesBareWord() public {
        // Arrange
        MockERC20 liar = new MockERC20(MockERC20.Ret.False);
        Distribution d = _escrowFailingToken(liar);

        // Act / assert
        vm.expectRevert(abi.encodeWithSelector(Distribution.ReleaseFailed.selector, address(liar)));
        d.release(address(liar), A);

        assertEq(d.escrowed(address(liar), A), 6000, "the failed retry leaves the escrow where it was");
        assertEq(d.reserved(address(liar)), 10_000, "and the reserve with it");

        // Arrange / act / assert — the other shape on this side of the threshold: 32 bytes of revert
        // data, the longest payload that is still named instead of bubbled.
        RevertingToken word = new RevertingToken(RevertingToken.Fail.WithRawBytes);
        word.setRevertBytes(32);
        Distribution e = _escrowFailingToken(word);

        vm.expectRevert(abi.encodeWithSelector(Distribution.ReleaseFailed.selector, address(word)));
        e.release(address(word), A);

        assertEq(e.escrowed(address(word), A), 6000, "32 bytes is still named, and still kept");
        assertEq(e.reserved(address(word)), 10_000);
    }

    /// @notice A reason worth having is kept. `Error(string)` wraps even a short reason to 100 bytes,
    /// which is over the threshold, so the string arrives rather than `ReleaseFailed`.
    /// @dev `MockERC20.InsufficientBalance()` is no use here: an argument-less custom error is 4
    /// bytes, so by the same rule it would come back named. The reason has to be a real string.
    function test_releaseBubblesLongReason() public {
        // Arrange
        RevertingToken tk = new RevertingToken(RevertingToken.Fail.WithString);
        Distribution d = _escrowFailingToken(tk);

        // Act / assert
        vm.expectRevert(abi.encodeWithSignature("Error(string)", tk.REASON()));
        d.release(address(tk), A);

        assertEq(d.escrowed(address(tk), A), 6000, "a bubbled reason leaves the escrow too");
        assertEq(d.reserved(address(tk)), 10_000);
    }

    /// @notice The threshold is `data.length <= 32`, so 33 bytes is the first payload that bubbles.
    /// Nothing else in the suite sits on that byte: the bare `false` is 32, `Refused()` is 4 and an
    /// `Error(string)` is 100, so without this the rule is only pinned from a distance.
    function test_releaseBubblesJustOverThreshold() public {
        // Arrange — the mock's default length is the tight case.
        RevertingToken tk = new RevertingToken(RevertingToken.Fail.WithRawBytes);
        assertEq(tk.revertBytes(), 33, "one byte over the threshold");
        assertEq(tk.rawRevertData().length, 33);
        Distribution d = _escrowFailingToken(tk);

        // Act / assert — the payload itself comes back, byte for byte, and not the name.
        vm.expectRevert(tk.rawRevertData());
        d.release(address(tk), A);
    }

    /// @notice An ETH row refusing its share is the same ruling with no token to name: `Refused()` is
    /// 4 bytes, under the threshold, so it comes back as `ReleaseFailed(address(0))`.
    function test_releaseFailedEthRecipient() public {
        // Arrange
        RevertingReceiver bad = new RevertingReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(address(bad), 5000);
        t[1] = _row(A, 5000);
        Distribution d = _deploy(0, _asc(t));
        _send(d, 10_000);
        d.distribute(address(0));
        assertEq(d.escrowed(address(0), address(bad)), 5000, "the refused push is escrowed");

        // Act / assert — it is still refusing, so the retry fails the same way.
        vm.expectRevert(abi.encodeWithSelector(Distribution.ReleaseFailed.selector, address(0)));
        d.release(address(0), address(bad));

        assertEq(d.escrowed(address(0), address(bad)), 5000, "and the escrow stays put");
        assertEq(d.reserved(address(0)), 5000);
    }

    /// @notice F5 / #95, decision 40. `release` retries under `PUSH_GAS`, so a recipient that needs
    /// more gas than the cap to accept ETH can never be pushed to — at *any* outer gas limit, because
    /// the cap is on the gas forwarded, not on the limit the caller sets. `claim` is the exit: the
    /// beneficiary pays for its own receive, so the same `receive()` is paid in full.
    /// This is #133's `test_escrowNeverReleasableForHungryRecipient` with the companion it asks for.
    function test_claimEthToSelfUncapped() public {
        // Arrange
        HungryReceiver h = new HungryReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(address(h), 5000);
        t[1] = _row(A, 5000);
        Distribution d = _deploy(0, _asc(t));
        _send(d, 1 ether);
        d.distribute(address(0));
        assertEq(d.escrowed(address(0), address(h)), 0.5 ether, "the capped push could not pay it");
        assertEq(d.reserved(address(0)), 0.5 ether);
        assertEq(A.balance, 0.5 ether, "the other row was paid");

        // Act / assert — ten million gas on the outside changes nothing, because the cap is inside.
        vm.expectRevert(abi.encodeWithSelector(Distribution.ReleaseFailed.selector, address(0)));
        d.release{gas: 10_000_000}(address(0), address(h));
        assertEq(d.escrowed(address(0), address(h)), 0.5 ether, "the escrow survived the retry");

        // And the account takes it itself, with its own gas.
        vm.expectEmit(true, true, false, true, address(d));
        emit Distribution.Claimed(address(0), address(h), address(h), 0.5 ether);
        h.take(d, address(0), address(h));

        assertEq(address(h).balance, 0.5 ether, "paid in full");
        assertEq(d.escrowed(address(0), address(h)), 0, "and the escrow is cleared");
        assertEq(d.reserved(address(0)), 0, "and no longer reserved");
        assertEq(address(d).balance, 0);

        // A second claim has nothing to move.
        vm.expectRevert(Distribution.NothingToDo.selector);
        h.take(d, address(0), address(h));
    }

    /// @notice The `to` of a claim is the account's choice, which is the half that rescues a recipient
    /// whose own `receive` is the problem. Not validated: it is the beneficiary's own money.
    function test_claimEthToOtherAddress() public {
        // Arrange
        HungryReceiver h = new HungryReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(address(h), 5000);
        t[1] = _row(A, 5000);
        Distribution d = _deploy(0, _asc(t));
        _send(d, 1 ether);
        d.distribute(address(0));
        assertEq(d.escrowed(address(0), address(h)), 0.5 ether);

        // Act
        h.take(d, address(0), C);

        // Assert
        assertEq(C.balance, 0.5 ether, "the named address holds the share");
        assertEq(address(h).balance, 0, "and the escrowed account itself was not paid");
        assertEq(d.escrowed(address(0), address(h)), 0);
        assertEq(d.reserved(address(0)), 0);
    }

    /// @notice F5's second mechanism: an issuer blocklist on the beneficiary makes every token retry
    /// revert, so `release` can never clear the escrow. `claim` moves the tokens the Distribution
    /// holds to an address the issuer's freeze did not reach — a property `SECURITY.md` states rather
    /// than hides, because it is the same mechanism that rescues an honest blocked recipient.
    function test_claimErc20() public {
        // Arrange — the token refuses `A`, so `A`'s row is escrowed by the token's own revert.
        BlocklistToken tk = new BlocklistToken(A);
        Distribution d = _deploy(0, _defaultTable());
        tk.mint(address(d), 10_000);
        d.distribute(address(tk));
        assertEq(d.escrowed(address(tk), A), 6000, "the blocked row is escrowed");
        assertEq(tk.balanceOf(B), 4000, "the unblocked row was paid");
        assertEq(d.reserved(address(tk)), 6000);

        // `release` cannot clear it: the token refuses `A` on every retry, with 36 bytes of reason.
        vm.expectRevert(abi.encodeWithSelector(BlocklistToken.Blocked.selector, A));
        d.release(address(tk), A);
        assertEq(d.escrowed(address(tk), A), 6000, "the escrow stays put");

        // Act — the blocked account claims to an address the token does not refuse.
        vm.expectEmit(true, true, false, true, address(d));
        emit Distribution.Claimed(address(tk), A, C, 6000);
        vm.prank(A);
        d.claim(address(tk), C);

        // Assert
        assertEq(tk.balanceOf(C), 6000, "the named address holds the tokens");
        assertEq(tk.balanceOf(A), 0, "the blocked account still holds none");
        assertEq(d.escrowed(address(tk), A), 0);
        assertEq(d.reserved(address(tk)), 0);
        assertEq(tk.balanceOf(address(d)), 0);
    }

    /// @notice `claim` takes the shared transient lock, so it is refused from inside a money path and
    /// refuses one from inside itself, exactly as `release` is (#21).
    /// @dev Two halves, because the reason and the sort are different facts. The recording half reads
    /// the refusal byte for byte out of a `CallbackToken` hook, which proves it is `Locked()` and
    /// **four bytes long**; the propagating half then shows what the outer `claim` does with four
    /// bytes, which by decision 24 is to *name* the failure, not to bubble it.
    function test_claimReentrancyLocked() public {
        // Arrange — a hook token whose `transfer` calls `claim` while `distribute` holds the lock.
        Distribution d = _deploy(0, _defaultTable());
        CallbackToken tk = new CallbackToken(address(d));
        tk.setAction(abi.encodeCall(Distribution.claim, (address(0), A)));
        tk.mint(address(d), 10_000);

        // Act / assert — the outer distribute succeeds and the refusal is readable.
        d.distribute(address(tk));
        assertFalse(tk.hookOk(), "the reentrant claim was refused");
        assertEq(tk.hookData(), abi.encodeWithSelector(Distribution.Locked.selector), "with Locked()");
        assertEq(tk.hookData().length, 4, "which is four bytes, at or under the word decision 24 sorts by");

        // And the other direction: a recipient that re-enters `claim` from inside its own claim.
        bytes32 salt = _salt();
        Distribution e = Distribution(payable(factory.predict(salt)));
        ReentrantClaimer r = new ReentrantClaimer(e);
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(address(r), 5000);
        t[1] = _row(A, 5000);
        assertEq(factory.create(OWNER, 0, "desc", _asc(t), salt), address(e));
        _send(e, 10_000);
        e.distribute(address(0));
        assertEq(e.escrowed(address(0), address(r)), 5000, "the reentrant push failed, so it escrowed");

        // Four bytes of `Locked()` come back through the failed send, so decision 24 names it.
        vm.expectRevert(abi.encodeWithSelector(Distribution.ReleaseFailed.selector, address(0)));
        r.take(address(0), address(r));
        assertEq(e.escrowed(address(0), address(r)), 5000, "and nothing was lost");
        assertEq(e.reserved(address(0)), 5000);
    }

    function test_nftTransferReverts() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        MockERC721 nft = new MockERC721();
        nft.mint(address(this), 1);

        // Act / assert — there is no ERC-721 receiver shim, so the callback has nothing to hit.
        vm.expectRevert();
        nft.safeTransferFrom(address(this), address(d), 1);
        assertEq(nft.ownerOf(1), address(this));
    }

    function test_nonOwnerCannotProposeOrCancel() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory action = abi.encodeCall(Distribution.setDelay, (1));
        vm.prank(OWNER);
        bytes32 hash = d.propose(action);

        // Act / assert
        vm.prank(STRANGER);
        vm.expectRevert(Distribution.NotOwner.selector);
        d.propose(action);

        vm.prank(STRANGER);
        vm.expectRevert(Distribution.NotOwner.selector);
        d.cancel(hash);
    }

    // ---------------------------------------------------------------------------------------------
    // F1 — no configuration change lands while a money path runs.
    // ---------------------------------------------------------------------------------------------

    /// @notice A hook token's recipient cannot apply a matured `setBeneficiaries` from inside the
    /// payout, so the rows after it are paid from the table `distribute` started on.
    /// @dev Leg 2's PoC from `audits/2026-10-30/AUDIT.md` F1. On `ede55c3` the hook's `applyQueued`
    /// succeeds, the loop's second pass reads the *new* `_table[1]`, and B — a row of the table in
    /// force when `distribute` was called — is paid nothing.
    function test_applyQueuedRefusedDuringDistribute() public {
        // Arrange — a clone on a real delay, so the swap has to be queued and matured.
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(A, 5000);
        t[1] = _row(B, 5000);
        Distribution d = _deploy(WEEK, t);

        CallbackToken tk = new CallbackToken(address(d));
        tk.mint(address(d), 10_000);

        // The swap the hook will try to land: A moves to the last row, where the remainder is paid.
        // `_asc` puts it in the order `_set` demands; what matters is that B is not in it.
        Distribution.Beneficiary[] memory swapped = new Distribution.Beneficiary[](2);
        swapped[0] = _row(C, 5000);
        swapped[1] = _row(A, 5000);
        bytes memory action = abi.encodeCall(Distribution.setBeneficiaries, (_asc(swapped)));

        vm.prank(OWNER);
        bytes32 hash = d.propose(action);
        tk.setAction(abi.encodeCall(Distribution.applyQueued, (action, 1)));
        vm.warp(block.timestamp + WEEK);
        assertEq(d.queued(hash), block.timestamp, "the action is matured and waiting");

        // Act
        d.distribute(address(tk));

        // Assert — the hook got in and was turned away by the lock, not by anything else.
        assertFalse(tk.hookOk(), "the reentrant applyQueued failed");
        assertEq(tk.hookData(), abi.encodeWithSelector(Distribution.Locked.selector), "and failed on the lock");

        // Assert — the payout used the table it started on.
        assertEq(tk.balanceOf(B), 5000, "B is paid from the table distribute started on");
        assertEq(tk.balanceOf(A), 5000);
        assertEq(tk.balanceOf(C), 0, "and a row nobody in that table had seen is paid nothing");

        // Assert — the refusal cost the queue nothing, and the action still applies from outside.
        assertEq(d.queued(hash), block.timestamp, "the action is still queued");
        assertEq(d.pendingCount(), 1);
        d.applyQueued(action, 1);
        assertEq(d.beneficiaries()[1].account, C, "and applies once no money path is running");
    }

    /// @notice The owner cannot `propose` from inside the payout either, even at zero delay where a
    /// proposal applies inline.
    /// @dev Leg 1 named `propose` as the second re-entry point. The owner here is the token itself,
    /// so the hook arrives with the one authority `propose` checks. On `ede55c3` the inline
    /// `setBeneficiaries` lands and the table after `distribute` is not the table before it.
    function test_proposeRefusedDuringDistribute() public {
        // Arrange — the clone's owner must be the token, and the token's target must be the clone,
        // so the address is predicted and the clone created at it.
        bytes32 salt = _salt();
        address predicted = factory.predict(salt);
        CallbackToken tk = new CallbackToken(predicted);

        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(A, 5000);
        t[1] = _row(B, 5000);
        Distribution d = Distribution(payable(factory.create(address(tk), 0, "desc", t, salt)));
        assertEq(address(d), predicted, "the clone landed where the token was told to look");
        assertEq(d.owner(), address(tk), "and the hook carries the owner's authority");
        tk.mint(address(d), 10_000);

        Distribution.Beneficiary[] memory swapped = new Distribution.Beneficiary[](2);
        swapped[0] = _row(C, 5000);
        swapped[1] = _row(A, 5000);
        tk.setAction(
            abi.encodeCall(Distribution.propose, (abi.encodeCall(Distribution.setBeneficiaries, (_asc(swapped)))))
        );

        // Act
        d.distribute(address(tk));

        // Assert
        assertFalse(tk.hookOk(), "the reentrant propose failed");
        assertEq(tk.hookData(), abi.encodeWithSelector(Distribution.Locked.selector), "and failed on the lock");

        Distribution.Beneficiary[] memory after_ = d.beneficiaries();
        assertEq(after_.length, 2, "the table after distribute is the table before it");
        assertEq(after_[0].account, A);
        assertEq(after_[1].account, B);
        assertEq(d.nonce(), 0, "and nothing was queued");
    }

    // ---------------------------------------------------------------------------------------------
    // F2 — a handover or a renounce clears the queue it inherits.
    // ---------------------------------------------------------------------------------------------

    /// @notice Taking ownership drops every action the previous owner queued.
    /// @dev On `ede55c3` the queue hash carries no owner, so `setDelay(1)` survives the handover and
    /// anyone can apply it against the new owner.
    function test_acceptOwnershipClearsQueue() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory handover = abi.encodeCall(Distribution.transferOwnership, (B));
        bytes memory setDelay = abi.encodeCall(Distribution.setDelay, (1));

        vm.prank(OWNER);
        d.propose(handover);
        vm.prank(OWNER);
        bytes32 delayHash = d.propose(setDelay);
        assertEq(d.pendingCount(), 2);

        vm.warp(block.timestamp + WEEK);
        d.applyQueued(handover, 1);
        assertEq(d.pendingOwner(), B, "the handover is nominated, not yet taken");
        assertEq(d.queued(delayHash), block.timestamp, "and the other action is still queued");

        // Act — `Cancelled` once, for the one action left.
        vm.expectEmit(true, false, false, true, address(d));
        emit Distribution.Cancelled(delayHash);
        vm.prank(B);
        d.acceptOwnership();

        // Assert
        assertEq(d.owner(), B);
        assertEq(d.pendingCount(), 0, "the previous owner's queue is empty");
        assertEq(d.queued(delayHash), 0);

        vm.expectRevert(abi.encodeWithSelector(Distribution.NotReady.selector, 0));
        d.applyQueued(setDelay, 2);
        assertEq(d.delay(), WEEK, "so the delay the old owner queued never landed");
    }

    /// @notice A renounce drops every queued action, so nothing the last owner queued can be applied
    /// against a contract with no owner left to cancel it.
    /// @dev Leg 2's PoC. On `ede55c3` the queued `transferOwnership(C)` still applies after the
    /// renounce, C becomes pending owner of a renounced contract, and `acceptOwnership()` makes C
    /// the owner — against `transferOwnership`'s own claim that a renounce freezes the thing.
    function test_renounceClearsQueue() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory handover = abi.encodeCall(Distribution.transferOwnership, (C));
        bytes memory renounce = abi.encodeCall(Distribution.transferOwnership, (address(0)));

        vm.prank(OWNER);
        bytes32 handoverHash = d.propose(handover);
        vm.prank(OWNER);
        d.propose(renounce);
        assertEq(d.pendingCount(), 2);

        vm.warp(block.timestamp + WEEK);

        // Act
        d.applyQueued(renounce, 2);

        // Assert
        assertEq(d.owner(), address(0), "the contract is renounced");
        assertEq(d.pendingCount(), 0, "and carries no queue into that state");
        assertEq(d.queued(handoverHash), 0);

        vm.expectRevert(abi.encodeWithSelector(Distribution.NotReady.selector, 0));
        d.applyQueued(handover, 1);
        assertEq(d.pendingOwner(), address(0), "so C never becomes pending owner");

        vm.prank(C);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.acceptOwnership();
    }

    /// @notice A renounce applied from a queue holding other actions clears them all without the pop
    /// loop colliding with the action that is executing.
    /// @dev `applyQueued` deletes its own entry and calls `_remove` *before* `_selfCall`, so the
    /// renounce is already out of `_pending` when `_clearQueue` runs. The renounce is queued in the
    /// middle on purpose: `_remove`'s swap-and-pop moves the last entry into its slot, so the loop
    /// has to pop an entry that moved.
    function test_renounceFromApplyClearsTheRest() public {
        // Arrange
        Distribution d = _deploy(WEEK, _defaultTable());
        bytes memory setDelay = abi.encodeCall(Distribution.setDelay, (1));
        bytes memory renounce = abi.encodeCall(Distribution.transferOwnership, (address(0)));
        bytes memory setDescription = abi.encodeCall(Distribution.setDescription, ("after"));

        vm.prank(OWNER);
        bytes32 delayHash = d.propose(setDelay);
        vm.prank(OWNER);
        d.propose(renounce);
        vm.prank(OWNER);
        bytes32 descHash = d.propose(setDescription);
        assertEq(d.pendingCount(), 3);

        vm.warp(block.timestamp + WEEK);

        // Act — the middle entry of the three.
        d.applyQueued(renounce, 2);

        // Assert
        assertEq(d.owner(), address(0));
        assertEq(d.pendingCount(), 0, "the executing action and both others are gone");
        assertEq(d.queued(delayHash), 0);
        assertEq(d.queued(descHash), 0);
        assertEq(d.delay(), WEEK, "and neither of the other two ran");
        assertEq(d.description(), "desc");

        vm.expectRevert(abi.encodeWithSelector(Distribution.NotReady.selector, 0));
        d.applyQueued(setDescription, 3);
    }

    // ---------------------------------------------------------------------------------------------
    // F6 — `distribute` copies no return data from a failed ETH push.
    // ---------------------------------------------------------------------------------------------

    /// @notice Twenty rows that each revert with 0x31000 bytes cost `distribute` none of the memory
    /// to hold them.
    /// @dev Leg 2 measured the old shape at 10.6M gas over ten such rows and 35.3M over twenty, which
    /// breaks the half-block property decision 27 rests on at about eleven rows. The rows are etched
    /// at their own range the way `TableCapTest._prepare` etches burners.
    function test_distributeDiscardsEthReturnData() public {
        // Arrange
        uint96 rows = 20;
        bytes memory code = address(new BloatingReceiver()).code;
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](rows);
        uint96 each = BPS_TOTAL / rows;
        for (uint96 i; i < rows; ++i) {
            address account = address(FIRST_BLOAT_ROW + uint160(i));
            vm.etch(account, code);
            t[i] = _row(account, i + 1 == rows ? BPS_TOTAL - each * (rows - 1) : each);
        }
        Distribution d = _deploy(0, t);
        _send(d, 20_000);

        // Act — nothing between the two reads but the call itself.
        uint256 before = gasleft();
        d.distribute(address(0));
        uint256 gasUsed = before - gasleft();
        emit log_named_uint("rows                   ", rows);
        emit log_named_uint("gas over bloating rows ", gasUsed);

        // Assert — every row failed and was escrowed, so the figure is of the right thing.
        assertEq(d.reserved(address(0)), 20_000, "every row was escrowed");
        assertEq(address(d).balance, 20_000, "and none of it left the contract");
        for (uint96 i; i < rows; ++i) {
            assertGt(d.escrowed(address(0), address(FIRST_BLOAT_ROW + uint160(i))), 0, "row escrowed");
        }

        // Assert — and the caller paid for none of the return data. On `ede55c3` this is above 30M.
        assertLt(gasUsed, 3_000_000, "the return data of a failed ETH push costs distribute nothing");
    }

    /// @notice `release` still bubbles a real reason from an ETH recipient: decision 24 holds on the
    /// path F6 changed.
    /// @dev `distribute` is the only caller that discards the return data. `release` asks for it, so a
    /// payload over the word it sorts by is bubbled rather than named `ReleaseFailed`. This is the
    /// guard on F6's fix, not a test of the finding, so it holds on `ede55c3` too.
    function test_releaseStillBubblesEthReason() public {
        // Arrange
        RawRevertReceiver bad = new RawRevertReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(address(bad), 5000);
        t[1] = _row(A, 5000);
        Distribution d = _deploy(0, _asc(t));
        _send(d, 10_000);

        d.distribute(address(0));
        assertEq(d.escrowed(address(0), address(bad)), 5000, "the push failed, so the row is escrowed");

        // Act / assert — the 33 bytes themselves, not `ReleaseFailed(token)`.
        bytes memory raw = bad.rawRevertData();
        assertEq(raw.length, 33, "the payload is over the word release sorts by");
        vm.expectRevert(raw);
        d.release(address(0), address(bad));
    }

    // ---------------------------------------------------------------------------------------------
    // F8 — the ERC-20 push passes no gas (sized here, ruled by D14).
    // ---------------------------------------------------------------------------------------------

    /// @notice What a hook token's recipient can do to the rows after it when the ERC-20 push passes
    /// no gas: it takes 63/64 of the frame, and the 1/64 left cannot pay the rest of the table at any
    /// block gas limit a chain actually has.
    /// @dev F8, measured rather than predicted, and the measurement is what D14 is ruled on. The
    /// first row is a `GasBurnerAny` reached through the token's `transfer`; the rest are plain rows.
    /// Bisected by hand to the round thousand: **95,226,000** gas is the first at which `distribute`
    /// completes, and 95,225,000 still reverts. A 30,000,000-gas block is barely a third of that, so
    /// a `distribute(token)` for this token cannot be mined until the owner re-tables through the
    /// delay — which is the remedy `SECURITY.md`'s F8 row names.
    ///
    /// Each limit is attempted in its own sub-call because `call{gas: n}` forwards only 63/64 of what
    /// the frame still holds: several ~95M attempts in one transaction starve each other and report a
    /// threshold that is an artefact of their position rather than of the contract. That is why the
    /// bisection ran one limit per test and this test spends three sub-calls, not eight.
    function test_hookRecipientStarvesLaterRows() public {
        // A whole 30M block is not enough: the rows after the burner are starved.
        assertFalse(_starvationSucceedsAt(30_000_000), "a 30,000,000-gas distribute is starved");

        // And the figure it does need, pinned from both sides at the round thousand.
        assertTrue(_starvationSucceedsAt(F8_SUCCEEDS_AT), "it first completes at 95,226,000");
        assertFalse(_starvationSucceedsAt(F8_SUCCEEDS_AT - 1_000), "and not at 95,225,000");

        emit log_named_uint("F8 distribute completes at   ", F8_SUCCEEDS_AT);
        emit log_named_uint("blocks of 30M that would take", F8_SUCCEEDS_AT / 30_000_000 + 1);
    }

    /// @dev One `distribute` over a table whose first row burns everything the token hands it,
    /// attempted under `limit` gas. Returns whether the call completed. `external` so the harness can
    /// catch the out-of-gas revert rather than die with it.
    function _starvationSucceedsAt(uint256 limit) internal returns (bool ok) {
        HookRecipientToken tk = new HookRecipientToken();

        // The burner is etched at the bottom of the range rather than deployed, so it is the first
        // row of an already-ascending table: a deployed address would sort somewhere in the middle
        // and the burner would no longer be the row that starves the others.
        //
        // Each attempt takes its own disjoint range, for the reason `TableCap.t.sol`'s docstring
        // gives: two attempts in one transaction over shared rows would find the second's rows warm
        // from the first, and EIP-2929's 2,600 a row across a cap-length table is far more than the
        // thousand this figure is bisected to.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint96 rows = uint96(impl.MAX_BENEFICIARIES());
        uint160 base = FIRST_STARVE_ROW + uint160(starveRanges++) * 0x1000;
        vm.etch(address(base), address(new GasBurnerAny()).code);

        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](rows);
        uint96 each = BPS_TOTAL / rows;
        for (uint96 i; i < rows; ++i) {
            uint96 bps = i + 1 == rows ? BPS_TOTAL - each * (rows - 1) : each;
            t[i] = _row(address(base + uint160(i)), bps);
        }
        Distribution d = _deploy(0, t);
        tk.mint(address(d), uint256(10_000) * rows);

        (ok,) = address(d).call{gas: limit}(abi.encodeCall(Distribution.distribute, (address(tk))));
    }

    /// @notice #133 item 3, rejected as a contract change: with `delay == 0` an owner contract can
    /// re-table to itself and `distribute` in one transaction. `PROJECT_OVERVIEW.md` § 5 decides a
    /// zero delay executes inline and is allowed, and the dapp, widget and `#/docs` flag it — this
    /// pins the shape so the flag is never quietly the only thing standing between the two.
    function test_delayZeroOwnerSweepsAtomically() public {
        // Arrange
        SweepingOwner o = new SweepingOwner();
        Distribution d = _deploy(address(o), 0, _defaultTable());
        _send(d, 10 ether);

        // Act
        o.sweep(d);

        // Assert
        assertEq(address(o).balance, 10 ether, "the owner swept the whole balance in one call");
        assertEq(A.balance, 0, "and the table it replaced was never paid");
        assertEq(B.balance, 0);
    }

    /// @notice #133 item 5, unchanged: an ERC-721 has `balanceOf` and no `transfer`, so `_balance`
    /// reads a *count* of NFTs, every push fails, and `distribute` escrows that count as if it were
    /// an amount. Accepted under F4's decision 23 — the escrow is phantom, and no NFT moves.
    function test_nftViaTransferFromPhantomEscrow() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        PlainNFT nft = new PlainNFT();
        nft.mint(address(this), 1);
        nft.mint(address(this), 2);
        nft.transferFrom(address(this), address(d), 1);
        nft.transferFrom(address(this), address(d), 2);

        // Act
        d.distribute(address(nft));

        // Assert — two NFTs read as an amount of 2, split 6000/4000 bps over two rows.
        assertEq(d.reserved(address(nft)), 2, "the count was escrowed, not the tokens");
        assertEq(d.escrowed(address(nft), A), 1);
        assertEq(d.escrowed(address(nft), B), 1);
        assertEq(nft.ownerOf(1), address(d), "and the NFTs never moved");
        assertEq(nft.ownerOf(2), address(d));

        // The phantom escrow is self-limiting: the whole balance is reserved, so there is no second.
        vm.expectRevert(Distribution.NothingToDo.selector);
        d.distribute(address(nft));
    }

    /// @notice #133 item 5, unchanged (accepted edge): a balance above 2²⁵⁶ ÷ `bps` overflows the
    /// share multiply. The arithmetic is checked, so it panics rather than wrapping, and the only
    /// loss is that `distribute` cannot be called for that token at that balance.
    function test_hugeBalanceOverflowsShareMath() public {
        // Arrange
        Distribution d = _deploy(0, _defaultTable());
        BigToken tk = new BigToken();
        tk.mint(address(d), type(uint256).max / 4_000);

        // Act / assert
        vm.expectRevert(stdError.arithmeticError);
        d.distribute(address(tk));
    }

    /// @notice #133 item 5, unchanged: the contract listed as its own row keeps that share, which
    /// then re-enters the next `distribute` as part of the balance. `_set` rejecting `address(this)`
    /// was one of the two optional hardenings #136 declines, with its reasons.
    function test_selfRowRecycles() public {
        // Arrange — the clone must be in its own table, so the salt is picked before the table is.
        bytes32 salt = _salt();
        Distribution d = Distribution(payable(factory.predict(salt)));
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = _row(address(d), 5000);
        t[1] = _row(A, 5000);
        assertEq(factory.create(OWNER, 0, "desc", _asc(t), salt), address(d));
        _send(d, 1 ether);

        // Act
        d.distribute(address(0));

        // Assert — its own share stayed put, and nothing is reserved against it.
        assertEq(address(d).balance, 0.5 ether, "the self row kept its share");
        assertEq(A.balance, 0.5 ether);
        assertEq(d.reserved(address(0)), 0, "the push to itself succeeded, so nothing was escrowed");

        // And it recycles: the retained half is the whole of the next distribute's amount.
        d.distribute(address(0));
        assertEq(A.balance, 0.75 ether, "half of what was left went out again");
        assertEq(address(d).balance, 0.25 ether);
    }

    /// @dev F10, over every three-row table rather than the one someone wrote down: each row but the
    /// last takes the floor of its bps share, the last takes the remainder, and the three sum to
    /// exactly what came in — so rounding can never pay out more than was distributed and can never
    /// leave a wei behind. `test_rounding_3333_3333_3334` is the hand-picked case.
    function testFuzz_roundingNeverExceedsAmount(uint96 amount, uint16[3] calldata bps) public {
        // Arrange — a table `_set` accepts: ascending, no zero share, summing to 10,000 bps. The casts
        // are safe because every bound above is below `BPS_TOTAL`, which is itself a `uint96`.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint96 b0 = uint96(bound(bps[0], 1, BPS_TOTAL - 2));
        // forge-lint: disable-next-line(unsafe-typecast)
        uint96 b1 = uint96(bound(bps[1], 1, BPS_TOTAL - 1 - b0));
        uint96 b2 = BPS_TOTAL - b0 - b1;

        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = _row(A, b0);
        t[1] = _row(B, b1);
        t[2] = _row(C, b2);
        Distribution d = _deploy(0, t);

        uint256 amount_ = bound(amount, 1, 1000 ether);

        // Act
        _send(d, amount_);
        d.distribute(address(0));

        // Assert
        assertEq(A.balance, (uint256(b0) * amount_) / BPS_TOTAL, "a row takes the floor of its share");
        assertEq(B.balance, (uint256(b1) * amount_) / BPS_TOTAL);
        assertGe(C.balance, (uint256(b2) * amount_) / BPS_TOTAL, "the last row takes the remainder");
        assertLe(C.balance, (uint256(b2) * amount_) / BPS_TOTAL + 2, "which is its share plus two rows of dust");
        assertEq(A.balance + B.balance + C.balance, amount_, "the three sum to exactly what came in");
        assertEq(address(d).balance, 0, "and nothing is left behind");
    }

    /// @dev Decision 10, over every salt: `create` takes one only if its top 20 bytes are the sender's,
    /// so a counterfactual address cannot be front-run, and the clone lands where `predict` said it
    /// would. `test_saltFrontRunningRejected` and `test_create2AddressStableAcrossChains` pin one salt
    /// each; this varies the low 12 bytes and holds everything else equal.
    function testFuzz_saltPrefixMustBeSender(bytes32 salt) public {
        // Arrange — one pair of salts with the same tail and different prefixes, so the prefix is the
        // only thing under test.
        uint256 tail = uint256(salt) & type(uint96).max;
        bytes32 mine = bytes32((uint256(uint160(address(this))) << 96) | tail);
        bytes32 theirs = bytes32((uint256(uint160(OWNER)) << 96) | tail);

        // Act / Assert — someone else's prefix is refused, whatever the tail.
        vm.expectRevert(DistributionFactory.SaltDoesNotStartWith.selector);
        factory.create(OWNER, 0, "desc", _defaultTable(), theirs);

        // … and the sender's own prefix lands at exactly `predict(salt)`.
        address predicted = factory.predict(mine);
        assertEq(factory.create(OWNER, 0, "desc", _defaultTable(), mine), predicted, "created where predicted");
        assertEq(Distribution(payable(predicted)).owner(), OWNER, "and it was initialised on the way");
    }

    /// @dev Decisions 39 and 25 over the whole window: a queued action applies if and only if
    /// `eta ≤ now ≤ eta + GRACE`, and a refusal leaves it queued. `test_applyQueuedExpires` and
    /// `test_staleActionExpires` pin single instants either side of the edge; this sweeps every offset
    /// from the proposal to well past the lapse.
    function testFuzz_applyWindow(uint32 delay, uint64 dt) public {
        // Arrange — a delay of at least a second, so the action queues rather than running inline. The
        // cast is safe because the bound is far below `type(uint32).max`.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint32 delay_ = uint32(bound(delay, 1, 365 days));
        Distribution d = _deploy(delay_, _defaultTable());
        bytes memory action = abi.encodeCall(Distribution.setDescription, ("next"));

        vm.prank(OWNER);
        d.propose(action);
        uint256 eta = block.timestamp + delay_;
        uint256 grace = d.GRACE();

        // Act — land anywhere between the proposal and a month past the lapse.
        vm.warp(block.timestamp + bound(dt, 0, uint256(delay_) + grace + 30 days));

        // Assert — a timelock is a timestamp comparison, the reading `src/Distribution.sol` takes.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < eta) {
            vm.expectRevert(abi.encodeWithSelector(Distribution.NotReady.selector, eta));
            d.applyQueued(action, 1);
            assertEq(d.pendingCount(), 1, "too early, and still queued");
            // forge-lint: disable-next-line(block-timestamp)
        } else if (block.timestamp > eta + grace) {
            vm.expectRevert(abi.encodeWithSelector(Distribution.Expired.selector, eta));
            d.applyQueued(action, 1);
            assertEq(d.pendingCount(), 1, "too late, and still queued");
        } else {
            d.applyQueued(action, 1);
            assertEq(d.description(), "next", "inside the window it applies");
            assertEq(d.pendingCount(), 0, "and leaves the queue");
        }
    }

    /// @dev F5 and decision 40 over every amount: an escrow the push cap can never deliver leaves
    /// through `claim`, exactly — all of it, to the address its own account names, with nothing left
    /// reserved. `test_claimEthToSelfUncapped` pins one amount.
    function testFuzz_claimMovesExactlyEscrow(uint128 amount) public {
        // Arrange — one row whose `receive()` costs more than `PUSH_GAS` forwards, so the whole
        // deposit is escrowed rather than paid.
        HungryReceiver hungry = new HungryReceiver();
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](1);
        t[0] = _row(address(hungry), BPS_TOTAL);
        Distribution d = _deploy(0, t);

        uint256 amount_ = bound(amount, 1, 1000 ether);
        _send(d, amount_);
        d.distribute(address(0));
        assertEq(d.escrowed(address(0), address(hungry)), amount_, "the push cap cannot deliver it");
        assertEq(d.reserved(address(0)), amount_);

        // Act — the escrowed account takes its own escrow, to an address it names.
        hungry.take(d, address(0), A);

        // Assert
        assertEq(A.balance, amount_, "exactly the escrow moved");
        assertEq(d.escrowed(address(0), address(hungry)), 0, "and the escrow is gone");
        assertEq(d.reserved(address(0)), 0);
        assertEq(address(d).balance, 0, "with nothing left behind");
    }

    function _row(address account, uint96 bps) internal pure returns (Distribution.Beneficiary memory) {
        return Distribution.Beneficiary({account: account, bps: bps, name: "name", note: "note"});
    }

    function _defaultTable() internal pure returns (Distribution.Beneficiary[] memory t) {
        t = new Distribution.Beneficiary[](2);
        t[0] = _row(A, 6000);
        t[1] = _row(B, 4000);
    }

    /// @dev `n` rows that break no rule but a length one: ascending accounts, no zero share, and a
    /// sum of exactly `BPS_TOTAL` with the remainder on the last row — the same construction
    /// `TableCap.t.sol`'s `_prepare` uses, so the two files agree on what a cap-length table is.
    function _capTable(uint256 n) internal pure returns (Distribution.Beneficiary[] memory t) {
        // One cast, as in `TableCap.t.sol`: the row loop and the `bps` split both want a type narrow
        // enough to fill `Beneficiary.bps` and to add to a `uint160` address.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint96 rows = uint96(n);

        t = new Distribution.Beneficiary[](rows);
        uint96 each = BPS_TOTAL / rows;
        for (uint96 i; i < rows; ++i) {
            uint96 bps = i + 1 == rows ? BPS_TOTAL - each * (rows - 1) : each;
            t[i] = _row(address(FIRST_CAP_ROW + uint160(i)), bps);
        }
    }

    /// @dev A clone holding 10,000 of `tk` with every row escrowed, for the `release` cases: each
    /// mock used here fails every push, so `distribute` escrows the whole balance instead of paying
    /// it, and `release` has something to retry.
    function _escrowFailingToken(MockERC20 tk) internal returns (Distribution d) {
        return _escrowFailingToken(address(tk));
    }

    function _escrowFailingToken(RevertingToken tk) internal returns (Distribution d) {
        return _escrowFailingToken(address(tk));
    }

    /// @dev Both failing mocks carry `mint(address,uint256)` and `balanceOf(address)` at the same
    /// selectors, so the core needs only the address.
    function _escrowFailingToken(address tk) internal returns (Distribution d) {
        d = _deploy(0, _defaultTable());
        MockERC20(tk).mint(address(d), 10_000);
        d.distribute(tk);

        assertEq(d.escrowed(tk, A), 6000, "the push failed, so the row is escrowed");
        assertEq(d.escrowed(tk, B), 4000);
        assertEq(d.reserved(tk), 10_000, "and nothing was paid out");
    }

    /// @dev Mock addresses are not known at authoring time, and the table must ascend by account.
    function _asc(Distribution.Beneficiary[] memory t) internal pure returns (Distribution.Beneficiary[] memory) {
        for (uint256 i = 1; i < t.length; ++i) {
            Distribution.Beneficiary memory x = t[i];
            uint256 j = i;
            while (j > 0 && t[j - 1].account > x.account) {
                t[j] = t[j - 1];
                --j;
            }
            t[j] = x;
        }
        return t;
    }

    function _deploy(uint32 delay_, Distribution.Beneficiary[] memory t) internal returns (Distribution d) {
        d = _deploy(OWNER, delay_, t);
    }

    /// @dev The owner-naming form, for the cases where the owner is a contract of the test's own.
    function _deploy(address owner_, uint32 delay_, Distribution.Beneficiary[] memory t)
        internal
        returns (Distribution d)
    {
        d = Distribution(payable(factory.create(owner_, delay_, "desc", t, _salt())));
    }

    /// @dev Bound to this contract, which is what calls `create` in this suite, with a counter below
    /// the prefix for a fresh address per call.
    function _salt() internal returns (bytes32) {
        return bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(++salts));
    }

    function _send(Distribution d, uint256 amount) internal {
        sender.send(address(d), amount);
    }

    function _expectBadInit(Distribution.Beneficiary[] memory t) internal {
        bytes32 salt = _salt();
        vm.expectRevert(Distribution.BadTable.selector);
        factory.create(OWNER, 0, "desc", t, salt);
    }

    function _expectBadSet(Distribution d, Distribution.Beneficiary[] memory t) internal {
        vm.prank(OWNER);
        vm.expectRevert(Distribution.BadTable.selector);
        d.propose(abi.encodeCall(Distribution.setBeneficiaries, (t)));
    }
}
