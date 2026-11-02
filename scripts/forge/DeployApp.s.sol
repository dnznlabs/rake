// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {App} from "../../src/App.sol";

/// forge script scripts/forge/DeployApp.s.sol --rpc-url $RPC --broadcast
/// env: OWNER (required, no default), APP_VERSION (default v0.1), APP_SALT (default zero)
contract DeployApp is Script {
    function run() external {
        // Required rather than defaulted (`SECURITY.md` F3). `vm.envOr("OWNER", msg.sender)` read
        // here, before `vm.startBroadcast()`, resolved to Foundry's DEFAULT_SENDER and not to the
        // broadcaster, so an unset OWNER handed `App` to an address nobody holds — and `lock()` with
        // it. A missing value now fails before any transaction. `mk/10-forge.mk` defaults it to
        // SENDER so `make deploy` keeps working on a dev chain; the runbook always exports it.
        address owner = vm.envAddress("OWNER");
        string memory ver = vm.envOr("APP_VERSION", string("v0.1"));
        // `App`'s address depends on OWNER and APP_VERSION as well as the salt, so the same-address
        // property holds only while all three are the same on every chain (`RUNBOOK.md` § 0).
        bytes32 salt = vm.envOr("APP_SALT", bytes32(0));

        vm.startBroadcast();
        App app = new App{salt: salt}(owner, ver);
        vm.stopBroadcast();

        console.log("APP_SALT", vm.toString(salt));
        console.log("owner", owner);
        console.log("App", address(app));
    }
}
