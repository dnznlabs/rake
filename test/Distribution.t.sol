// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Distribution, DistributionFactory} from "../src/Distribution.sol";
import {
    HookToken,
    MockERC20,
    MockERC721,
    PlainSender,
    ReentrantDistributor,
    ReentrantReleaser,
    RevertingReceiver,
    RevertingToken
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

        // Act
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
        d = Distribution(payable(factory.create(OWNER, delay_, "desc", t, _salt())));
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
