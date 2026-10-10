// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {App} from "../../src/App.sol";

/// Uploads app/dist/index.html.gz (or index.html) as SSTORE2 chunks and points App at them.
/// forge script scripts/forge/Chunks.s.sol --rpc-url $RPC --broadcast
/// env: APP (App address), GZIP (default true)
/// Needs read access to ./app/dist in foundry.toml `fs_permissions`.
contract Chunks is Script {
    uint256 constant MAX_CHUNK = 24_000; // under the 24,576-byte code limit with SSTORE2's 1-byte prefix

    function run() external {
        App app = App(vm.envAddress("APP"));
        bool gz = vm.envOr("GZIP", true);
        bytes memory data = vm.readFileBinary(gz ? "app/dist/index.html.gz" : "app/dist/index.html");
        console.log("payload bytes", data.length);

        vm.startBroadcast();
        uint256 n = (data.length + MAX_CHUNK - 1) / MAX_CHUNK;
        address[] memory ptrs = new address[](n);
        for (uint256 i; i < n; ++i) {
            uint256 start = i * MAX_CHUNK;
            uint256 end = start + MAX_CHUNK > data.length ? data.length : start + MAX_CHUNK;
            bytes memory part = new bytes(end - start);
            for (uint256 j; j < part.length; ++j) {
                part[j] = data[start + j];
            }
            ptrs[i] = app.addChunk(part);
            console.log("chunk", i, ptrs[i]);
        }
        app.setChunks(ptrs, gz);
        vm.stopBroadcast();

        console.log("html() bytes", bytes(app.html()).length);
    }
}
