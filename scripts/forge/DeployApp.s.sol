// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {App} from "../../src/App.sol";

/// forge script scripts/forge/DeployApp.s.sol --rpc-url $RPC --broadcast
/// env: OWNER (defaults to the broadcaster), APP_VERSION (default v0.1)
contract DeployApp is Script {
    function run() external {
        address owner = vm.envOr("OWNER", msg.sender);
        string memory ver = vm.envOr("APP_VERSION", string("v0.1"));

        vm.startBroadcast();
        App app = new App(owner, ver);
        vm.stopBroadcast();

        console.log("App", address(app));
    }
}
