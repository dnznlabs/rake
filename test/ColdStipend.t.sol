// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Distribution, DistributionFactory} from "../src/Distribution.sol";
import {PlainSender} from "./mocks/Mocks.sol";

/// @dev The cold-implementation half of `receive()`, which `Distribution.t.sol` cannot reach: its
/// `test_receiveUnderStipend` deploys the clone inside the test, so the implementation the clone
/// delegates into is already warm when the ETH arrives, and the 2,300-gas stipend is enough. Here the
/// clone is created in `setUp` instead. Warm accounts do not survive into the test body — `setUp` and
/// each test function are separate transactions and the access list resets between them — so a test's
/// first touch of the clone is the first touch of its transaction, and the implementation is cold.
/// `vm.cool` is not used: it cools storage slots rather than accounts, and only for the last address
/// given, so it reported a cold minimum of zero when m01-t01 tried it.
///
/// One probe per test function for the same reason: a transaction can only have one first touch, so
/// the figure below was bisected one transaction at a time rather than in a loop.
contract ColdStipendTest is Test {
    DistributionFactory internal factory;
    Distribution internal impl;
    Distribution internal clone;
    PlainSender internal sender;

    address internal constant OWNER = address(0xB0B);
    address internal constant A = address(0x1001);
    address internal constant B = address(0x1002);

    /// @dev What `transfer` and `send` forward, and all they forward.
    uint256 internal constant STIPEND = 2300;

    /// @dev The measured gas a clone's `receive()` frame needs when the implementation is cold:
    /// **4,162**, bisected on this tree with devbox-pinned forge 1.7.1, one transaction per probe —
    /// 1,861 forwarded on top of the stipend fails, 1,862 succeeds. It is the warm figure
    /// `SECURITY.md` F7 settles at 1,662 plus the 2,500 a cold account access adds to the clone's
    /// `DELEGATECALL` (2,600 cold against 100 warm), not plus the full 2,600: the "1,662 + 2,600 =
    /// 4,262" F7 quotes from the second review leg counts the warm access twice.
    /// @dev Bytecode-dependent, like `F8_SUCCEEDS_AT`: the delegated body is `Distribution`'s own, so
    /// re-bisect this whenever `src/Distribution.sol` moves.
    uint256 internal constant COLD_FRAME = 4162;

    function setUp() public {
        factory = new DistributionFactory();
        impl = Distribution(payable(factory.implementation()));
        sender = new PlainSender();
        vm.deal(address(sender), 1000 ether);

        Distribution.Beneficiary[] memory t = new Distribution.Beneficiary[](2);
        t[0] = Distribution.Beneficiary({account: A, bps: 6000, name: "name", note: "note"});
        t[1] = Distribution.Beneficiary({account: B, bps: 4000, name: "name", note: "note"});
        bytes32 salt = bytes32(uint256(uint160(address(this))) << 96 | 1);
        clone = Distribution(payable(factory.create(OWNER, 0, "desc", t, salt)));
    }

    /// @notice #174: a contract or vault that pays a distribution with `transfer` or `send` fails on
    /// the first touch of a transaction. The ETH stays with the payer — nothing is lost — but the
    /// deposit does not happen, which is why the dapp's Limits section and `SECURITY.md` F7 tell a
    /// payer to use `call` and forward gas.
    function test_receiveUnderStipendRevertsWhenImplementationIsCold() public {
        // Act / assert — `PlainSender.send` is `payable(to).transfer(amount)`, so the frame gets the
        // stipend and nothing else. The clone's own `receive()` runs out inside the `DELEGATECALL`,
        // which leaves no return data, so the revert `transfer` raises is bare.
        vm.expectRevert();
        sender.send(address(clone), 1 ether);

        // Assert — the ETH never left the payer.
        assertEq(address(clone).balance, 0, "the deposit did not land");
        assertEq(address(sender).balance, 1000 ether, "and the payer still holds it");
    }

    /// @notice The figure itself, from the side that has to hold: `COLD_FRAME` is enough.
    function test_coldReceiveFitsTheMeasuredFrame() public {
        // Act — the first touch of this transaction, so the implementation is cold. A `call` with
        // value hands the callee its gas argument plus the stipend, so this frame is `COLD_FRAME`.
        vm.expectEmit(true, false, false, true, address(clone));
        emit Distribution.Received(address(this), 1 ether);
        (bool ok,) = payable(address(clone)).call{value: 1 ether, gas: COLD_FRAME - STIPEND}("");

        // Assert
        assertTrue(ok, "the cold frame is enough at the measured figure");
        assertEq(address(clone).balance, 1 ether);
    }

    /// @notice And from the side that has to fail, so the figure is pinned rather than bounded: one
    /// gas less is not enough. Without this, any frame above the true minimum would pass the test
    /// above and the constant would stop measuring anything.
    function test_coldReceiveFailsOneGasUnderTheMeasuredFrame() public {
        // Act — same first touch, one gas short.
        (bool ok,) = payable(address(clone)).call{value: 1 ether, gas: COLD_FRAME - STIPEND - 1}("");

        // Assert
        assertFalse(ok, "one gas under the measured figure, the frame runs out");
        assertEq(address(clone).balance, 0, "so the deposit did not land");
    }

    /// @notice Why `Distribution.t.sol`'s `test_receiveUnderStipend` passes, said here rather than
    /// left implied: warm the implementation first and the same `transfer` succeeds. That test is
    /// true of a warm implementation only, and this is the fixture difference that makes it so.
    function test_receiveUnderStipendPassesOnceImplementationIsWarm() public {
        // Arrange — any touch of the implementation account warms it for the rest of the transaction.
        impl.GRACE();

        // Act
        vm.expectEmit(true, false, false, true, address(clone));
        emit Distribution.Received(address(sender), 1 ether);
        sender.send(address(clone), 1 ether);

        // Assert
        assertEq(address(clone).balance, 1 ether, "the stipend covers a warm implementation");
    }
}
