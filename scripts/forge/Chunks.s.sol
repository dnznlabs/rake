// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {App} from "../../src/App.sol";

/// Uploads both documents as SSTORE2 chunks and points App at them: app/dist/index.html.gz (or
/// index.html) as the dapp, app/dist/widget.js as the widget, which is never gzipped.
/// forge script scripts/forge/Chunks.s.sol --rpc-url $RPC --broadcast
/// env: APP (App address), GZIP (default true)
/// Needs read access to ./app/dist in foundry.toml `fs_permissions`.
contract Chunks is Script {
    /// Under the 24,576-byte code limit with SSTORE2's 1-byte prefix, and under both gas ceilings of
    /// RUNBOOK § Gas at the prices read on 2026-11-19. Read from the environment so the dev chain and
    /// `tools/step4-calldata.mjs --max-chunk` cut at the same number; the default is the committed one.
    uint256 MAX_CHUNK = vm.envOr("MAX_CHUNK", uint256(24_000));

    function run() external {
        App app = App(vm.envAddress("APP"));
        bool gz = vm.envOr("GZIP", true);
        bytes memory data = vm.readFileBinary(gz ? "app/dist/index.html.gz" : "app/dist/index.html");
        console.log("payload bytes", data.length);

        bytes memory widget = vm.readFileBinary("app/dist/widget.js");

        vm.startBroadcast();
        address[] memory ptrs = _upload(data, app.addChunk, "chunk");
        app.setChunks(ptrs, gz);
        address[] memory widgetPtrs = _upload(widget, app.addWidgetChunk, "widget chunk");
        app.setWidgetChunks(widgetPtrs);
        vm.stopBroadcast();

        console.log("html() bytes", bytes(app.html()).length);
        console.log("widget bytes", bytes(app.widget()).length);
    }

    /// Cuts `data` into MAX_CHUNK pieces, stores each through `add`, and returns the pointers in order.
    function _upload(bytes memory data, function(bytes memory) external returns (address) add, string memory label)
        internal
        returns (address[] memory ptrs)
    {
        uint256 n = (data.length + MAX_CHUNK - 1) / MAX_CHUNK;
        ptrs = new address[](n);
        for (uint256 i; i < n; ++i) {
            uint256 start = i * MAX_CHUNK;
            uint256 end = start + MAX_CHUNK > data.length ? data.length : start + MAX_CHUNK;
            bytes memory part = new bytes(end - start);
            for (uint256 j; j < part.length; ++j) {
                part[j] = data[start + j];
            }
            ptrs[i] = add(part);
            console.log(label, i, ptrs[i]);
        }
    }
}
