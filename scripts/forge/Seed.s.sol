// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Distribution, DistributionFactory} from "../../src/Distribution.sol";

/// @notice Creates the dev chain's *featured* distribution: a two-row table, a 1 ETH deposit and one
/// queued change, so every dev chain has something worth rendering before a wallet is connected.
/// @dev Not a `Deploy*.s.sol`: the deploy loop in `mk/10-forge.mk` runs those with no environment, and
/// this one needs the factory's address. `mk/15-seed.mk` runs it between the deploy and the dapp build.
///
///   FACTORY=<factory> FEATURED_SALT=<salt> \
///     forge script scripts/forge/Seed.s.sol --rpc-url $RPC --broadcast --unlocked --sender $SENDER
contract Seed is Script {
    /// @dev anvil accounts 2 and 1, ascending by address because `BadTable` requires it. Account 0 is
    /// the sender and the owner, so it is not a beneficiary.
    address constant OPS = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address constant TREASURY = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    uint32 constant DELAY = 7 days;
    uint256 constant DEPOSIT = 1 ether;
    string constant DESCRIPTION = "DNZN fees";

    function run() external {
        DistributionFactory factory = DistributionFactory(vm.envAddress("FACTORY"));
        bytes32 salt = vm.envBytes32("FEATURED_SALT");
        address featured = factory.predict(salt);

        // A second `create` on a used salt burns the whole gas limit before `DeploymentFailed` (#22),
        // so the salt is read with `eth_getCode` first and a non-empty answer is refused. anvil
        // restarts empty; this fires when `make deploy` runs twice against one chain.
        if (featured.code.length != 0) {
            console.log("featured (already seeded, left alone)", featured);
            return;
        }

        vm.startBroadcast();
        // `msg.sender` is `--sender`, which `create` also requires to be the salt's top 20 bytes
        // (decision 10) — so a sender that does not own this salt reverts rather than seeding a
        // distribution owned by the wrong key.
        address distribution = factory.create(msg.sender, DELAY, DESCRIPTION, _table(false), salt);
        // The deposit is a plain transfer, not `create{value:}`: `msg.value` would ride the CREATE2
        // into the clone without ever running `receive()`, so the dev chain would carry a balance and
        // no `Received` log, and the dapp's activity list would read "nothing has arrived at this
        // address yet" above 1 ETH (#42). Sent after create, it emits the one log the first screen
        // needs.
        (bool ok,) = distribution.call{value: DEPOSIT}("");
        require(ok, "deposit");
        // The owner is the sender and the delay is non-zero, so this queues rather than applies.
        Distribution(payable(distribution)).propose(abi.encodeCall(Distribution.setBeneficiaries, (_table(true))));
        vm.stopBroadcast();

        console.log("featured", distribution);
        console.log("chain", block.chainid);
        console.log("pending", Distribution(payable(distribution)).pendingCount());
    }

    /// @dev The chain picks the shares, so two dev chains carry two different tables at the same
    /// address — the drift the dapp has to show rather than hide. `revised` swaps the two shares,
    /// which is what the queued change does.
    function _table(bool revised) private view returns (Distribution.Beneficiary[] memory table) {
        uint96 ops = block.chainid == 31337 ? 6000 : 7000;
        if (revised) ops = 10_000 - ops;

        table = new Distribution.Beneficiary[](2);
        table[0] = Distribution.Beneficiary(OPS, ops, "ops", "operations");
        table[1] = Distribution.Beneficiary(TREASURY, 10_000 - ops, "treasury", "");
    }
}
