// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {Distribution} from "../src/Distribution.sol";
import {
    MockERC20,
    MockERC721,
    PlainSender,
    ReentrantDistributor,
    ReentrantReleaser,
    RevertingReceiver
} from "./mocks/Mocks.sol";

/// @dev Every case runs against a PUSH0 clone of a single implementation, because `receive()` rejects
/// ETH on the implementation and `init` is callable only by whoever deployed it. t02 replaces
/// `_clone` with `factory.create(...)`; nothing else here should need to move.
contract DistributionTest is Test {
    Distribution internal impl;
    PlainSender internal sender;

    address internal constant OWNER = address(0xB0B);
    address internal constant STRANGER = address(0x5EE);
    address internal constant A = address(0x1001);
    address internal constant B = address(0x1002);
    address internal constant C = address(0x1003);

    uint32 internal constant WEEK = 7 days;

    function setUp() public {
        impl = new Distribution();
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
        // Arrange — the mocks need the clone's address, so init comes after they exist.
        Distribution d = Distribution(payable(LibClone.clone_PUSH0(address(impl))));
        ReentrantDistributor viaDistribute = new ReentrantDistributor(d);
        ReentrantReleaser viaRelease = new ReentrantReleaser(d);
        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](3);
        t[0] = _row(address(viaDistribute), 3000);
        t[1] = _row(address(viaRelease), 3000);
        t[2] = _row(A, 4000);
        d.init(OWNER, 0, "desc", _asc(t));
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
        // Arrange
        Distribution d = Distribution(payable(LibClone.clone_PUSH0(address(impl))));
        Distribution.Beneficiary[] memory t = _defaultTable();

        // Act / assert
        vm.prank(STRANGER);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.init(OWNER, 0, "desc", t);

        d.init(OWNER, 0, "desc", t);
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
        d = Distribution(payable(LibClone.clone_PUSH0(address(impl))));
        d.init(OWNER, delay_, "desc", t);
    }

    function _send(Distribution d, uint256 amount) internal {
        sender.send(address(d), amount);
    }

    function _expectBadInit(Distribution.Beneficiary[] memory t) internal {
        Distribution d = Distribution(payable(LibClone.clone_PUSH0(address(impl))));
        vm.expectRevert(Distribution.BadTable.selector);
        d.init(OWNER, 0, "desc", t);
    }

    function _expectBadSet(Distribution d, Distribution.Beneficiary[] memory t) internal {
        vm.prank(OWNER);
        vm.expectRevert(Distribution.BadTable.selector);
        d.propose(abi.encodeCall(Distribution.setBeneficiaries, (t)));
    }
}
