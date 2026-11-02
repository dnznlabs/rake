// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {DistributionFactory} from "../../src/Distribution.sol";

/// forge script scripts/forge/Deploy.s.sol --rpc-url $RPC --broadcast
/// env: FACTORY_SALT (default zero) — the salt the deterministic deployer places the factory with
contract Deploy is Script {
    function run() external {
        // A salted `new` inside a broadcast is routed through Foundry's default CREATE2 deployer,
        // Arachnid's keyless proxy at 0x4e59b448…0B4956C (`ROADMAP.md` decision 33), so the address
        // depends on that deployer, this salt and the init code — never on the sender's nonce. The
        // zero default keeps `make deploy` on a dev chain working with no environment.
        bytes32 salt = vm.envOr("FACTORY_SALT", bytes32(0));

        vm.startBroadcast();
        DistributionFactory factory = new DistributionFactory{salt: salt}();
        vm.stopBroadcast();

        // The implementation is created inside the constructor, so it is not a CREATE transaction in
        // the broadcast log and `make addresses` cannot list it.
        console.log("FACTORY_SALT", vm.toString(salt));
        console.log("DistributionFactory", address(factory));
        console.log("implementation", factory.implementation());
    }
}
