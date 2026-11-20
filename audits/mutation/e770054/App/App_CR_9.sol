// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "solady/auth/Ownable.sol";
import {SSTORE2} from "solady/utils/SSTORE2.sol";
import {Base64} from "solady/utils/Base64.sol";

/// @title App
/// @notice The dapp and its embeddable widget, hosted by this contract.
///         ERC-8244: `html()` returns the whole document.
///         ERC-5219 / ERC-6944: `request()` serves "/" with a text/html header so web3:// gateways
///         render it at the root, and `request(["widget.js"])` the widget as application/javascript.
/// @dev Two resources, two pointer lists: `chunks` for the dapp and `widgetChunks` for the widget.
///      Each document lives in SSTORE2 chunks, concatenated at read time. If `gzipped`, `html()` wraps
///      the base64 payload in a bootstrap that inflates it client-side with DecompressionStream. The
///      widget is served raw and never wrapped: a `<script src="widget.js">` fetched through a gateway
///      must be plain JavaScript, and the bootstrap is an HTML document a script tag cannot run.
///      `lock()` freezes both lists; it requires the dapp and does not require a widget.
contract App is Ownable {
    struct KeyValue {
        string key;
        string value;
    }

    address[] public chunks;
    address[] public widgetChunks;
    bool public gzipped;
    bool public locked;
    string public version;

    event ChunksSet(uint256 count, bool gzipped);
    event WidgetChunksSet(uint256 count);
    event VersionSet(string version);
    event AppLocked();

    error Locked();
    /// @dev A pointer holding no code. `SSTORE2.read` on one expands memory past any block gas limit,
    ///      so `html()` and `request()` would run out of gas for every caller.
    error CodelessChunk(address ptr);
    /// @dev A pointer that holds code but is not an SSTORE2 chunk: its first byte is not the `STOP`
    ///      `SSTORE2.write` prefixes (`lib/solady/src/utils/SSTORE2.sol:52`). The case that matters is
    ///      an EIP-7702 delegation designator, `0xef0100‖address`: it has code, so `code.length` admits
    ///      it, and its key holder can re-point or clear it after `lock()`, changing or breaking what
    ///      `html()` serves. EIP-3541 means no deployed contract begins with `0xef`, and `SSTORE2.read`
    ///      discards byte 0, so a pointer that fails this check could never have been read correctly.
    error ForeignChunk(address ptr);
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
        bytes memory doc = _raw(chunks);
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

    /// @notice The widget, as stored: the raw concatenation of `widgetChunks`, never wrapped.
    function widget() public view returns (string memory) {
        return string(_raw(widgetChunks));
    }

    function resolveMode() external pure returns (bytes32) {
        return "5219";
    }

    /// @dev An empty `widgetChunks` answers "widget.js" with the same 404 as any unknown path, so an
    ///      `App` carrying the dapp and no widget is a complete site rather than a broken one.
    function request(string[] memory resource, KeyValue[] memory)
        external
        view
        returns (uint16 statusCode, string memory body, KeyValue[] memory headers)
    {
        bool root = resource.length == 0
            || (resource.length == 1 && (_eq(resource[0], "") || _eq(resource[0], "index.html")));
        if (root) {
            headers = new KeyValue[](1);
            headers[0] = KeyValue("Content-Type", "text/html; charset=utf-8");
            return (200, html(), headers);
        }
        if (resource.length == 1 && _eq(resource[0], "widget.js") && widgetChunks.length != 0) {
            headers = new KeyValue[](1);
            headers[0] = KeyValue("Content-Type", "application/javascript; charset=utf-8");
            return (200, widget(), headers);
        }
        return (404, "", new KeyValue[](0));
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
            _requireChunk(ptrs[i]);
            chunks.push(ptrs[i]);
        }
        gzipped = gzipped_;
        emit ChunksSet(ptrs.length, gzipped_);
    }

    /// @notice Store one widget chunk (<= 24,575 bytes) and append its pointer.
    function addWidgetChunk(bytes calldata data) external onlyOwner returns (address ptr) {
        if (locked) revert Locked();
        ptr = SSTORE2.write(data);
        widgetChunks.push(ptr);
        emit WidgetChunksSet(widgetChunks.length);
    }

    /// @notice Replace the whole widget pointer list. No gzip flag: the widget is always raw.
    /// @dev These pointers arrive from calldata, unlike `addWidgetChunk`'s, so each must hold code.
    function setWidgetChunks(address[] calldata ptrs) external onlyOwner {
        if (locked) revert Locked();
        if (ptrs.length == 0) revert EmptyDocument();
        delete widgetChunks;
        for (uint256 i; i < ptrs.length; ++i) {
            _requireChunk(ptrs[i]);
            widgetChunks.push(ptrs[i]);
        }
        emit WidgetChunksSet(ptrs.length);
    }

    function setVersion(string calldata v) external onlyOwner {
        if (locked) revert Locked();
        version = v;
        emit VersionSet(v);
    }

    /// @notice Freeze both documents permanently. One-way.
    /// @dev Re-checks that the documents are readable rather than trusting `setChunks`: a one-way door
    ///      should not depend on a guarantee stated in another function. Not an `html()` call, which
    ///      is unbounded gas and would fail for size rather than correctness. The emptiness check is
    ///      the dapp's alone: a dapp with no widget is a complete document, and the widget's own
    ///      pointers are still checked for code so a locked `App` cannot carry an unreadable one.
    ///      The re-check is for a readable *chunk* and not merely for code, because a pointer that
    ///      holds code that is not a chunk is the thing the lock must refuse: its bytes can still
    ///      change afterwards, which is exactly the promise `lock()` exists to make.
    function lock() external onlyOwner {
        uint256 n = chunks.length;
        if (n == 0) revert EmptyDocument();
        for (uint256 i; i < n; ++i) {
            _requireChunk(chunks[i]);
        }
        uint256 w = widgetChunks.length;
        for (uint256 i; i < w; ++i) {
            _requireChunk(widgetChunks[i]);
        }
        locked = true;
        //emit AppLocked();
    }

    function chunkCount() external view returns (uint256) {
        return chunks.length;
    }

    function widgetChunkCount() external view returns (uint256) {
        return widgetChunks.length;
    }

    function _raw(address[] storage list) internal view returns (bytes memory out) {
        uint256 n = list.length;
        for (uint256 i; i < n; ++i) {
            out = bytes.concat(out, SSTORE2.read(list[i]));
        }
    }

    /// @dev Reverts unless `ptr` is a readable SSTORE2 chunk: non-empty code whose first byte is 0x00.
    function _requireChunk(address ptr) private view {
        uint256 n;
        bytes32 first;
        /// @solidity memory-safe-assembly
        assembly {
            n := extcodesize(ptr)
            extcodecopy(ptr, 0x00, 0x00, 0x01)
            first := mload(0x00)
        }
        if (n == 0) revert CodelessChunk(ptr);
        if (first[0] != 0x00) revert ForeignChunk(ptr);
    }

    function _eq(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
