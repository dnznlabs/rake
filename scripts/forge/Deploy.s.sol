// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {DistributionFactory} from "../../src/Distribution.sol";

/// forge script scripts/forge/Deploy.s.sol --rpc-url $RPC --broadcast
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        DistributionFactory factory = new DistributionFactory();
        vm.stopBroadcast();

        // The implementation is created inside the constructor, so it is not a CREATE transaction in
        // the broadcast log and `make addresses` cannot list it.
        console.log("DistributionFactory", address(factory));
        console.log("implementation", factory.implementation());
    }
}
