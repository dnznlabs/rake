// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Distribution, DistributionFactory} from "../../src/Distribution.sol";
import {MockERC20} from "../mocks/Mocks.sol";
import {DistributionHandler} from "./DistributionHandler.sol";

/// @notice Seven properties that must hold after every call of every random sequence the handler
/// drives. Each one names the document that promises it. This is a different class of check from the
/// unit suite: the unit tests pin sequences someone wrote down, and these look for the one nobody did.
///
/// @dev `fail_on_revert = false` in `foundry.toml`, so a revert the handler did not catch is discarded
/// rather than failing the run. That is what makes the two reported numbers load-bearing: forge's own
/// call summary (`-vv`) for the calls and bubbled reverts per selector, and the handler's `absorbed`
/// counters — printed by `afterInvariant` under `INV_SUMMARY=1` — for the refusals it caught on
/// purpose. A suite whose handler reverted on every call would read exactly as green as this one.
///
/// Run them alone with `devbox run -- forge test --match-path 'test/invariant/*'`.
contract DistributionInvariantsTest is StdInvariant, Test {
    DistributionFactory internal factory;
    DistributionHandler internal handler;
    Distribution internal dist;

    /// @dev What the handler funds itself with. Each `deposit` sends at most 1/128 of what is left, so
    /// this is large enough that 12,800 calls cannot drain it into a run of no-ops.
    uint256 internal constant PURSE = 1000 ether;
    /// @dev The value that rides the `create`, so `init`'s prefunded branch is exercised once per run.
    uint256 internal constant AT_INIT = 1 ether;

    /// @dev Mirrors of the handler's set sizes. Held locally because an invariant is evaluated after
    /// every call of every run, and a getter call per loop iteration is a cost paid 12,800 times over.
    /// `setUp` asserts they still agree with the handler.
    uint256 internal constant ACTORS = 6;
    uint256 internal constant TOKENS = 3;

    function setUp() public {
        factory = new DistributionFactory();
        vm.deal(address(this), PURSE + AT_INIT);
        handler = new DistributionHandler{value: PURSE + AT_INIT}(factory, AT_INIT);
        dist = handler.dist();

        assertEq(handler.ACTORS(), ACTORS, "the actor set is the size the invariants loop over");
        assertEq(handler.TOKENS(), TOKENS, "and so is the token set");

        // `invariant_conservation` accounts for ETH as "in the contract or in an actor", which is only
        // exact if no actor starts with any. Asserted rather than assumed.
        for (uint256 i; i < ACTORS; ++i) {
            assertEq(handler.actors(i).balance, 0, "an actor starts with no ETH");
        }
        assertEq(address(dist).balance, AT_INIT, "the create's value reached the clone");

        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: _entryPoints()}));
    }

    /// @notice `PROJECT_OVERVIEW.md` § 5 and `_set`: a table is one to `MAX_BENEFICIARIES` rows, every
    /// share non-zero, accounts strictly ascending, and the shares sum to exactly 10,000 bps.
    function invariant_tableSumsToBps() public view {
        Distribution.Beneficiary[] memory t = dist.beneficiaries();
        assertGt(t.length, 0, "a table is never empty");
        assertLe(t.length, dist.MAX_BENEFICIARIES(), "and never over the cap");

        uint256 sum;
        address prev;
        for (uint256 i; i < t.length; ++i) {
            assertGt(t[i].bps, 0, "no row holds a zero share");
            assertGt(uint160(t[i].account), uint160(prev), "accounts are strictly ascending");
            prev = t[i].account;
            sum += t[i].bps;
        }
        assertEq(sum, 10_000, "the shares sum to 10,000 bps");
    }

    /// @notice The escrow accounting, F4's row: `reserved[token]` is the sum of what is escrowed, for
    /// every account, and nothing else. A drift either way is a double-pay or a stuck balance.
    function invariant_reservedEqualsEscrowSum() public view {
        for (uint256 i; i < TOKENS; ++i) {
            address token = handler.tokens(i);
            uint256 sum;
            for (uint256 j; j < ACTORS; ++j) {
                sum += dist.escrowed(token, handler.actors(j));
            }
            assertEq(dist.reserved(token), sum, "reserved is exactly the escrow sum");
        }
    }

    /// @notice The invariant decision 23 rests on: the contract always holds at least what it has
    /// promised, so an escrow is always payable. True because the excluded token class is excluded —
    /// a fee-on-transfer or rebasing balance is what would break it, and F4 documents that.
    /// @dev Asserted for all three tokens rather than the plan's two. `reserved[plain]` is always zero
    /// — `MockERC20.transfer` has no recipient hook, so a plain-token push never fails and never
    /// escrows — so the plain arm alone would be vacuous; the `false`-returning token is the one that
    /// actually carries an escrow balance to cover.
    function invariant_balanceCoversReserved() public view {
        assertGe(address(dist).balance, dist.reserved(address(0)), "ETH covers its escrow");
        for (uint256 i = 1; i < TOKENS; ++i) {
            MockERC20 token = MockERC20(handler.tokens(i));
            assertGe(token.balanceOf(address(dist)), dist.reserved(address(token)), "the token covers its escrow");
        }
    }

    /// @notice Nothing is minted or lost by `distribute`, `release` or `claim`: every wei the handler
    /// put in is either still in the contract or in one of the actors, exactly, and the same per token.
    /// F10's remainder-to-the-last-row is design, so this is asserted instead of "distribute leaves
    /// zero balance" — which it does not, under escrow.
    function invariant_conservation() public view {
        uint256 held = address(dist).balance;
        for (uint256 j; j < ACTORS; ++j) {
            held += handler.actors(j).balance;
        }
        assertEq(handler.ethIn(), held, "every wei in is in the contract or in an actor");

        for (uint256 i = 1; i < TOKENS; ++i) {
            MockERC20 token = MockERC20(handler.tokens(i));
            uint256 units = token.balanceOf(address(dist));
            for (uint256 j; j < ACTORS; ++j) {
                units += token.balanceOf(handler.actors(j));
            }
            assertEq(handler.tokenIn(address(token)), units, "every token unit in is accounted for");
        }
    }

    /// @notice Decisions 39 and 25, F9/F13: an action applies only inside `[eta, eta + GRACE]`, only
    /// once, and never after it was cancelled or cleared by an ownership move.
    /// @dev The three conditions are evaluated the instant `applyQueued` returns and kept as counters
    /// rather than re-derived here, because an invariant runs after *every* call and a walk over the
    /// recorded actions would make the campaign quadratic in `depth`. The handler's `eta` comes from
    /// the delay in force at propose time, never read back out of `queued`, so the check does not ask
    /// the contract to confirm its own answer.
    function invariant_noActionOutsideWindow() public view {
        assertEq(handler.outsideWindowApplies(), 0, "nothing applied before its eta or after GRACE");
        assertEq(handler.doubleApplies(), 0, "nothing applied twice");
        assertEq(handler.appliesAfterCancel(), 0, "nothing applied after a cancel or a queue clear");
    }

    /// @notice F2's queue clear and decision 21: only the owner queues an action, and a renounce is
    /// final — `owner()` stays zero, no pending owner survives it, and `propose` reverts for everyone.
    /// `test_renounceClearsQueue` is the unit version.
    function invariant_ownerOrNobody() public {
        assertEq(handler.strangerProposals(), 0, "a non-owner never queued an action");
        if (!handler.renounced()) return;

        assertEq(dist.owner(), address(0), "a renounce is final");
        assertEq(dist.pendingOwner(), address(0), "and leaves nobody nominated");

        // Probed under a state snapshot, so asking the question does not answer it differently next
        // call: a zero delay would make this `propose` apply its action inline.
        uint256 snap = vm.snapshotState();
        vm.prank(handler.STRANGER_1());
        (bool ok,) = address(dist).call(abi.encodeCall(Distribution.propose, (_noop())));
        assertFalse(ok, "and `propose` is refused");
        vm.revertToState(snap);
    }

    /// @notice The transient lock is never held between calls. Read through the `notLocked` surface:
    /// `propose` is the function that refuses while a money path is running, so at rest it must fail
    /// for any reason except `Locked()`.
    function invariant_lockNeverHeld() public {
        address owner_ = dist.owner();
        uint256 snap = vm.snapshotState();
        vm.prank(owner_ == address(0) ? handler.STRANGER_1() : owner_);
        (bool ok, bytes memory data) = address(dist).call(abi.encodeCall(Distribution.propose, (_noop())));
        vm.revertToState(snap);

        if (ok) return;
        assertTrue(_selector(data) != Distribution.Locked.selector, "the lock is not held at rest");
    }

    /// @dev Printed once per campaign, under `INV_SUMMARY=1`, at `-vv`. Every entry point with its
    /// call count and the refusals the handler caught rather than let bubble — the handoff's evidence
    /// that `fail_on_revert = false` is not hiding a suite that never ran.
    function afterInvariant() public view {
        if (vm.envOr("INV_SUMMARY", uint256(0)) == 0) return;

        string[14] memory labels = handler.labels();
        for (uint256 i; i < labels.length; ++i) {
            // "INVSUM <entry point> <calls> <absorbed reverts>", one line each, for `awk`.
            console.log(string(abi.encodePacked("INVSUM ", labels[i])), handler.calls(i), handler.absorbed(i));
        }
        console.log("INVSUM entries", handler.entryCount());
        console.log("INVSUM renounced", handler.renounced());
    }

    /// @dev The fourteen state-changing handler functions, named rather than left to forge's default,
    /// so a getter added later cannot quietly start consuming the fuzzer's depth.
    function _entryPoints() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](14);
        s[0] = DistributionHandler.deposit.selector;
        s[1] = DistributionHandler.distribute.selector;
        s[2] = DistributionHandler.release.selector;
        s[3] = DistributionHandler.claim.selector;
        s[4] = DistributionHandler.proposeSetTable.selector;
        s[5] = DistributionHandler.proposeSetDescription.selector;
        s[6] = DistributionHandler.proposeSetDelay.selector;
        s[7] = DistributionHandler.proposeTransferOwnership.selector;
        s[8] = DistributionHandler.proposeFromStranger.selector;
        s[9] = DistributionHandler.applyQueued.selector;
        s[10] = DistributionHandler.cancel.selector;
        s[11] = DistributionHandler.acceptOwnership.selector;
        s[12] = DistributionHandler.warp.selector;
        s[13] = DistributionHandler.mint.selector;
    }

    /// @dev The cheapest action that changes nothing a later call reads.
    function _noop() internal pure returns (bytes memory) {
        return abi.encodeCall(Distribution.setDescription, ("rest"));
    }

    function _selector(bytes memory data) internal pure returns (bytes4 sel) {
        if (data.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            sel := mload(add(data, 0x20))
        }
    }
}
