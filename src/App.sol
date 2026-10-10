// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "solady/auth/Ownable.sol";
import {SSTORE2} from "solady/utils/SSTORE2.sol";
import {Base64} from "solady/utils/Base64.sol";

/// @title App
/// @notice The dapp, hosted by this contract.
///         ERC-8244: `html()` returns the whole document.
///         ERC-5219 / ERC-6944: `request()` serves "/" with a text/html header so web3:// gateways
///         render it at the root.
/// @dev The document lives in SSTORE2 chunks, concatenated at read time. If `gzipped`, `html()` wraps
///      the base64 payload in a bootstrap that inflates it client-side with DecompressionStream.
contract App is Ownable {
    struct KeyValue {
        string key;
        string value;
    }

    address[] public chunks;
    bool public gzipped;
    bool public locked;
    string public version;

    event ChunksSet(uint256 count, bool gzipped);
    event VersionSet(string version);
    event AppLocked();

    error Locked();
    /// @dev A pointer holding no code. `SSTORE2.read` on one expands memory past any block gas limit,
    ///      so `html()` and `request()` would run out of gas for every caller.
    error CodelessChunk(address ptr);
    /// @dev No pointers at all: `html()` would return an empty document.
    error EmptyDocument();

    constructor(address owner_, string memory version_) {
        _initializeOwner(owner_);
        version = version_;
    }

    /// @dev Every byte of the bootstrap is load-bearing and `test_gzipBootstrap` pins all of it.
    ///      It swaps the document in with `DOMParser`, not `document.open()`, which orphans an
    ///      extension wallet's content script. `DOMParser` marks the scripts it builds non-executable,
    ///      so each is re-created; `replaceWith` runs an inline script synchronously on insertion,
    ///      which preserves document order for inline, attribute-free scripts and nothing else.
    function html() public view returns (string memory) {
        bytes memory doc = _raw();
        if (!gzipped) return string(doc);
        return string.concat(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>app</title></head><body><script>',
            '(async()=>{const b=atob("',
            Base64.encode(doc),
            '");',
            "const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);",
            "const t=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();",
            "const d=new DOMParser().parseFromString(t,'text/html');",
            "document.replaceChild(document.importNode(d.documentElement,true),document.documentElement);",
            "for(const s of[...document.querySelectorAll('script')]){const n=document.createElement('script');",
            "for(const a of s.attributes)n.setAttribute(a.name,a.value);",
            "n.textContent=s.textContent;s.replaceWith(n);}})();",
            "</script></body></html>"
        );
    }

    function resolveMode() external pure returns (bytes32) {
        return "5219";
    }

    function request(string[] memory resource, KeyValue[] memory)
        external
        view
        returns (uint16 statusCode, string memory body, KeyValue[] memory headers)
    {
        bool root = resource.length == 0
            || (resource.length == 1 && (_eq(resource[0], "") || _eq(resource[0], "index.html")));
        if (!root) return (404, "", new KeyValue[](0));
        headers = new KeyValue[](1);
        headers[0] = KeyValue("Content-Type", "text/html; charset=utf-8");
        return (200, html(), headers);
    }

    /// @notice Store one chunk (<= 24,575 bytes) and append its pointer.
    function addChunk(bytes calldata data) external onlyOwner returns (address ptr) {
        if (locked) revert Locked();
        ptr = SSTORE2.write(data);
        chunks.push(ptr);
        emit ChunksSet(chunks.length, gzipped);
    }

    /// @notice Replace the whole pointer list (reuse already-deployed chunks, reorder, or reset).
    /// @dev These pointers arrive from calldata, unlike `addChunk`'s, so each must hold code.
    function setChunks(address[] calldata ptrs, bool gzipped_) external onlyOwner {
        if (locked) revert Locked();
        if (ptrs.length == 0) revert EmptyDocument();
        delete chunks;
        for (uint256 i; i < ptrs.length; ++i) {
            if (ptrs[i].code.length == 0) revert CodelessChunk(ptrs[i]);
            chunks.push(ptrs[i]);
        }
        gzipped = gzipped_;
        emit ChunksSet(ptrs.length, gzipped_);
    }

    function setVersion(string calldata v) external onlyOwner {
        if (locked) revert Locked();
        version = v;
        emit VersionSet(v);
    }

    /// @notice Freeze the document permanently. One-way.
    /// @dev Re-checks that the document is readable rather than trusting `setChunks`: a one-way door
    ///      should not depend on a guarantee stated in another function. Not an `html()` call, which
    ///      is unbounded gas and would fail for size rather than correctness.
    function lock() external onlyOwner {
        uint256 n = chunks.length;
        if (n == 0) revert EmptyDocument();
        for (uint256 i; i < n; ++i) {
            if (chunks[i].code.length == 0) revert CodelessChunk(chunks[i]);
        }
        locked = true;
        emit AppLocked();
    }

    function chunkCount() external view returns (uint256) {
        return chunks.length;
    }

    function _raw() internal view returns (bytes memory out) {
        uint256 n = chunks.length;
        for (uint256 i; i < n; ++i) {
            out = bytes.concat(out, SSTORE2.read(chunks[i]));
        }
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
