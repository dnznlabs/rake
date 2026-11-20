// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {Distribution, DistributionFactory} from "../src/Distribution.sol";

/// @dev `--match-contract Distribution` matches this suite as well as `DistributionTest`, which is
/// what the milestone's test-list criterion relies on.
contract DistributionFactoryTest is Test {
    address internal constant OWNER = address(0xB0B);
    address internal constant OTHER = address(0xBEE);
    address internal constant STRANGER = address(0x5EE);
    address internal constant A = address(0x1001);
    address internal constant B = address(0x1002);
    address internal constant C = address(0x1003);

    uint32 internal constant WEEK = 7 days;

    /// @dev The factory is placed with CREATE2 so it lands at one address in both halves, which is the
    /// property under test: a clone's address follows from the factory and the salt, nothing else.
    function test_create2AddressStableAcrossChains() public {
        // Arrange
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(7));
        uint256 snap = vm.snapshotState();

        // Act — one chain
        vm.chainId(1);
        DistributionFactory mainnet = new DistributionFactory{salt: keccak256("rake.test")}();
        address factory1 = address(mainnet);
        address impl1 = mainnet.implementation();
        address predicted = mainnet.predict(salt);
        address d1 = mainnet.create(OWNER, 0, "one", _table(A, 6000, B, 4000), salt);
        address soladyPredicted = LibClone.predictDeterministicAddress_PUSH0(impl1, salt, factory1);

        // Act — another chain, same deployer and salt, a different distribution
        vm.revertToState(snap);
        vm.chainId(8453);
        DistributionFactory base = new DistributionFactory{salt: keccak256("rake.test")}();
        address d2 = base.create(OTHER, WEEK, "two", _table(A, 1, C, 9999), salt);

        // Assert
        assertEq(factory1, address(base), "the factory lands at one address on both chains");
        assertEq(impl1, base.implementation(), "and so does the implementation it deploys");
        assertEq(d1, d2, "and so does the clone, whatever it was initialised with");
        assertTrue(d1.code.length > 0, "the clone is really there");
        assertEq(d1, predicted, "predict() is the address create() reaches");
        assertEq(d1, soladyPredicted, "and solady's own predictor agrees");
        assertEq(Distribution(payable(d2)).owner(), OTHER, "the second deploy is the second table");
        assertEq(Distribution(payable(d2)).delay(), WEEK);
    }

    function test_saltFrontRunningRejected() public {
        // Arrange
        DistributionFactory factory = new DistributionFactory();
        address alice = makeAddr("alice");
        address bob = makeAddr("bob");
        bytes32 aliceSalt = bytes32(uint256(uint160(alice)) << 96) | bytes32(uint256(1));
        bytes32 openSalt = bytes32(uint256(2));
        Distribution.Beneficiary[] memory t = _table(A, 6000, B, 4000);

        // Act / assert — bob cannot deploy under a salt that starts with alice
        vm.prank(bob);
        vm.expectRevert(DistributionFactory.SaltDoesNotStartWith.selector);
        factory.create(OWNER, 0, "desc", t, aliceSalt);

        // alice can, and the clone carries what she passed
        vm.prank(alice);
        address mine = factory.create(OWNER, 0, "desc", t, aliceSalt);
        assertEq(Distribution(payable(mine)).owner(), OWNER);

        // a zero prefix is nobody's prefix, so a salt carrying one is refused whoever sends it
        vm.prank(bob);
        vm.expectRevert(DistributionFactory.SaltDoesNotStartWith.selector);
        factory.create(OTHER, 0, "desc", t, openSalt);

        vm.prank(alice);
        vm.expectRevert(DistributionFactory.SaltDoesNotStartWith.selector);
        factory.create(OTHER, 0, "desc", t, openSalt);

        // the used salt is spent, and the collision costs the whole gas limit before it says so
        uint256 before = gasleft();
        vm.prank(alice);
        vm.expectRevert(DistributionFactory.DeploymentFailed.selector);
        factory.create(OWNER, 0, "desc", t, aliceSalt);
        uint256 used = before - gasleft();

        // Nine tenths, not a figure: the number tracks the harness gas limit, and the claim being
        // pinned is "the whole limit" — which `63/64` of the available gas satisfies and a cheap
        // revert never can. The two logs are what the handoff quotes; `-vv` shows them.
        emit log_named_uint("collision gas available", before);
        emit log_named_uint("collision gas used", used);
        assertGt(used, before * 9 / 10, "the collision burns the gas available, not a cheap revert");
    }

    function test_factoryRejectsEth() public {
        // Arrange
        DistributionFactory factory = new DistributionFactory();
        vm.deal(address(this), 1 ether);

        // Act
        (bool factoryOk,) = payable(address(factory)).call{value: 1}("");
        (bool implOk,) = payable(factory.implementation()).call{value: 1}("");

        // Assert
        assertFalse(factoryOk, "the factory has neither receive nor fallback");
        assertFalse(implOk, "the implementation refuses ETH outside a clone");
    }

    function test_createEmitsAndInits() public {
        // Arrange
        DistributionFactory factory = new DistributionFactory();
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96);
        address predicted = factory.predict(salt);
        Distribution.Beneficiary[] memory t = _table(A, 2500, C, 7500);

        // Act
        vm.expectEmit(address(factory));
        emit DistributionFactory.Created(predicted, OWNER);
        Distribution d = Distribution(payable(factory.create(OWNER, WEEK, "a description", t, salt)));

        // Assert
        Distribution.Snapshot memory s = d.snapshot();
        assertEq(s.owner, OWNER);
        assertEq(s.delay, WEEK);
        assertEq(s.nonce, 0);
        assertEq(s.description, "a description");
        assertEq(s.table.length, 2);
        assertEq(s.table[0].account, A);
        assertEq(s.table[0].bps, 2500);
        assertEq(s.table[0].name, "name");
        assertEq(s.table[0].note, "note");
        assertEq(s.table[1].account, C);
        assertEq(s.table[1].bps, 7500);
        assertEq(s.pending.length, 0);

        // init is spent: neither a stranger nor the factory itself can run it again
        vm.prank(STRANGER);
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.init(STRANGER, 0, "hijacked", t);

        vm.prank(address(factory));
        vm.expectRevert(Distribution.Unauthorized.selector);
        d.init(STRANGER, 0, "hijacked", t);
    }

    function test_createForwardsValue() public {
        // Arrange
        DistributionFactory factory = new DistributionFactory();
        vm.deal(address(this), 1 ether);
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(3));
        Distribution.Beneficiary[] memory t = _table(A, 6000, B, 4000);

        // Act
        vm.recordLogs();
        address d = factory.create{value: 1 ether}(OWNER, 0, "desc", t, salt);

        // Assert
        assertEq(d.balance, 1 ether, "the deposit rode the CREATE2");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2, "two logs: the clone's Received, then the factory's Created");

        // `init` logs value present at initialisation, with `address(0)` for "sender unknown" (#136).
        assertEq(logs[0].topics[0], Distribution.Received.selector);
        assertEq(logs[0].emitter, d, "the clone emitted it, not the factory");
        assertEq(address(uint160(uint256(logs[0].topics[1]))), address(0), "the sentinel sender");
        assertEq(abi.decode(logs[0].data, (uint256)), 1 ether);

        assertEq(logs[1].topics[0], DistributionFactory.Created.selector);
        assertEq(logs[1].emitter, address(factory));
    }

    /// @notice The other half of #136 item 7, and #133's `test_counterfactualFundsFollowCreatorTable`:
    /// ETH sent to the address `predict` names before any code exists there is present when `init`
    /// runs, so it reaches the log too — the case a `create`-value-only log would miss entirely.
    /// It then distributes to the creator's table, which is the cross-chain trust property the
    /// `create` NatSpec documents.
    function test_prefundedAddressLogsReceivedAtInit() public {
        // Arrange — fund the counterfactual address first, with no code at it.
        DistributionFactory factory = new DistributionFactory();
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(7));
        address predicted = factory.predict(salt);
        assertEq(predicted.code.length, 0, "nothing is deployed there yet");
        vm.deal(address(this), 3 ether);
        (bool funded,) = predicted.call{value: 3 ether}("");
        assertTrue(funded, "a plain send to an address with no code");
        assertEq(predicted.balance, 3 ether);

        Distribution.Beneficiary[] memory t = _table(A, 6000, B, 4000);

        // Act
        vm.recordLogs();
        address d = factory.create(OWNER, 0, "desc", t, salt);

        // Assert
        assertEq(d, predicted, "the clone landed on the funded address");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2, "two logs, so the indices below mean something");
        assertEq(logs[0].topics[0], Distribution.Received.selector);
        assertEq(logs[0].emitter, d);
        assertEq(address(uint160(uint256(logs[0].topics[1]))), address(0), "the sentinel sender");
        assertEq(abi.decode(logs[0].data, (uint256)), 3 ether, "the whole pre-funded balance");

        // And the funds follow the creator's table, not the funder's intent.
        Distribution(payable(d)).distribute(address(0));
        assertEq(A.balance, 1.8 ether);
        assertEq(B.balance, 1.2 ether);
    }

    /// @notice The other side of the guard above: an ordinary `create`, onto an address nobody
    /// funded, logs no `Received` at all. Without this the guard was pinned only from its true side,
    /// and a `create` announcing a phantom zero-value receipt would have read as correct.
    /// @dev Found by the m05-t01b mutation campaign: forcing `init`'s `address(this).balance != 0`
    /// to `true` (`[MIA] Line 143`) survived the whole suite.
    function test_unfundedCreateLogsNoReceived() public {
        // Arrange
        DistributionFactory factory = new DistributionFactory();
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96) | bytes32(uint256(8));
        address predicted = factory.predict(salt);
        assertEq(predicted.balance, 0, "nothing funded the counterfactual address");
        Distribution.Beneficiary[] memory t = _table(A, 6000, B, 4000);

        // Act
        vm.recordLogs();
        address d = factory.create(OWNER, 0, "desc", t, salt);

        // Assert — the factory's `Created` and nothing else; in particular no `Received`.
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 1, "one log, so the index below means something");
        assertEq(logs[0].topics[0], DistributionFactory.Created.selector);
        assertTrue(logs[0].topics[0] != Distribution.Received.selector, "an unfunded create announces no receipt");
        assertEq(d.balance, 0);
    }

    function _table(address first, uint96 firstBps, address second, uint96 secondBps)
        internal
        pure
        returns (Distribution.Beneficiary[] memory t)
    {
        t = new Distribution.Beneficiary[](2);
        t[0] = Distribution.Beneficiary({account: first, bps: firstBps, name: "name", note: "note"});
        t[1] = Distribution.Beneficiary({account: second, bps: secondBps, name: "name", note: "note"});
    }
}
