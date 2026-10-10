// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {App} from "../src/App.sol";
import {LibString} from "solady/utils/LibString.sol";

contract AppTest is Test {
    /// @dev ERC-6944's `resolveMode` value, as `App.resolveMode()` returns it. Declared rather
    ///      than written `bytes32("5219")` inline: the literal converts implicitly here, which is the
    ///      same conversion without the explicit cast `unsafe-typecast` flags.
    bytes32 internal constant RESOLVE_MODE = "5219";

    App app;
    address owner = makeAddr("owner");

    function setUp() public {
        app = new App(owner, "v0.1");
    }

    function test_rawChunksConcat() public {
        vm.startPrank(owner);
        app.addChunk("<!DOCTYPE html><p>d");
        app.addChunk("oc</p>");
        vm.stopPrank();
        assertEq(app.html(), "<!DOCTYPE html><p>doc</p>");
        assertEq(app.chunkCount(), 2);
    }

    /// @dev Pins the whole bootstrap, not a substring of it. Every byte of it is load-bearing: the
    ///      `DOMParser` swap keeps an extension wallet's content-script relay alive where `document.open()`
    ///      killed it, and the script re-creation after it is what makes the inflated document's own
    ///      scripts run. Both are silent when broken — the page renders either way — so nothing but a
    ///      byte comparison catches a drift here. A deliberate change to `html()` updates this literal.
    function test_gzipBootstrap() public {
        vm.startPrank(owner);
        address p = app.addChunk(hex"1f8b0800");
        address[] memory ptrs = new address[](1);
        ptrs[0] = p;
        app.setChunks(ptrs, true);
        vm.stopPrank();
        string memory h = app.html();
        assertEq(
            h,
            string.concat(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>app</title></head><body><script>',
                '(async()=>{const b=atob("H4sIAA==");', // base64 of 1f8b0800
                "const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);",
                "const t=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();",
                "const d=new DOMParser().parseFromString(t,'text/html');",
                "document.replaceChild(document.importNode(d.documentElement,true),document.documentElement);",
                "for(const s of[...document.querySelectorAll('script')]){const n=document.createElement('script');",
                "for(const a of s.attributes)n.setAttribute(a.name,a.value);",
                "n.textContent=s.textContent;s.replaceWith(n);}})();",
                "</script></body></html>"
            )
        );
        assertEq(bytes(h).length, 685); // 677-byte wrapper around 8 base64 bytes
        assertFalse(LibString.contains(h, "document.open("));
    }

    /// @dev `gzipped` false is the other half of the branch and shares no code with the bootstrap:
    ///      the chunks come back verbatim, so nothing can wrap or escape them.
    function test_uncompressedBranchEmitsNoBootstrap() public {
        vm.prank(owner);
        app.addChunk("<!DOCTYPE html><p>x</p>");
        string memory h = app.html();
        assertEq(h, "<!DOCTYPE html><p>x</p>");
        assertFalse(LibString.contains(h, "DecompressionStream"));
        assertFalse(LibString.contains(h, "DOMParser"));
    }

    function test_requestRoot() public {
        vm.prank(owner);
        app.addChunk("<p>x</p>");
        string[] memory res = new string[](0);
        App.KeyValue[] memory params = new App.KeyValue[](0);
        (uint16 code, string memory body, App.KeyValue[] memory hdr) = app.request(res, params);
        assertEq(code, 200);
        assertEq(body, "<p>x</p>");
        assertEq(hdr[0].key, "Content-Type");
        res = new string[](1);
        res[0] = "index.html";
        (code,,) = app.request(res, params);
        assertEq(code, 200);
        res[0] = "nope";
        (code,,) = app.request(res, params);
        assertEq(code, 404);
        assertEq(app.resolveMode(), RESOLVE_MODE);
    }

    function test_lock() public {
        vm.startPrank(owner);
        app.addChunk("a");
        app.lock();
        vm.expectRevert(App.Locked.selector);
        app.addChunk("b");
        vm.expectRevert(App.Locked.selector);
        app.setVersion("v0.2");
        vm.stopPrank();
        assertEq(app.version(), "v0.1");
    }

    function test_onlyOwner() public {
        vm.expectRevert();
        app.addChunk("a");
    }

    /// @dev `setChunks` takes its pointers from calldata, so a codeless address is reachable by an
    ///      owner mistake. It has to be rejected before it is stored: `SSTORE2.read` masks
    ///      `extcodesize(ptr) - 1` to five bytes, so reading one expands memory past any block gas
    ///      limit and `html()` becomes uncallable for everyone. The error carries the address.
    function test_setChunksRejectsCodelessPointer() public {
        address codeless = makeAddr("codeless");
        assertEq(codeless.code.length, 0);
        address[] memory ptrs = new address[](1);
        ptrs[0] = codeless;
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(App.CodelessChunk.selector, codeless));
        app.setChunks(ptrs, false);
    }

    /// @dev A codeless pointer anywhere in the list, not just at index 0 — the guard is inside the
    ///      push loop, and a check that only read `ptrs[0]` would pass the test above unchanged.
    function test_setChunksRejectsCodelessPointerAmongValidOnes() public {
        vm.startPrank(owner);
        address good = app.addChunk("<p>x</p>");
        address codeless = makeAddr("codeless2");
        address[] memory ptrs = new address[](3);
        ptrs[0] = good;
        ptrs[1] = codeless;
        ptrs[2] = good;
        vm.expectRevert(abi.encodeWithSelector(App.CodelessChunk.selector, codeless));
        app.setChunks(ptrs, false);
        vm.stopPrank();
        // The reverted call left the list it would have replaced intact.
        assertEq(app.chunkCount(), 1);
        assertEq(app.html(), "<p>x</p>");
    }

    /// @dev `setChunks([])` is indistinguishable from a mistake, and `html()` would return an empty
    ///      document. Rejected at both doors, not only at `lock()`.
    function test_setChunksRejectsEmptyList() public {
        address[] memory ptrs = new address[](0);
        vm.prank(owner);
        vm.expectRevert(App.EmptyDocument.selector);
        app.setChunks(ptrs, false);
    }

    /// @dev The positive control for both `setChunks` guards: a well-formed pointer list still goes
    ///      through, and the document it produces is byte-identical to the one `addChunk` served
    ///      before the pointers were re-set. Without this, a guard that rejected everything would
    ///      pass every test above.
    function test_setChunksAcceptsValidPointers() public {
        vm.startPrank(owner);
        address a = app.addChunk("<!DOCTYPE html><p>d");
        address b = app.addChunk("oc</p>");
        string memory docBefore = app.html();
        address[] memory ptrs = new address[](2);
        ptrs[0] = a;
        ptrs[1] = b;
        app.setChunks(ptrs, false);
        vm.stopPrank();
        assertEq(app.chunkCount(), 2);
        assertEq(app.html(), docBefore);
        assertEq(app.html(), "<!DOCTYPE html><p>doc</p>");
    }

    /// @dev `lock()` is the door that makes a mistake permanent, so it re-checks its subject rather
    ///      than trusting the `setChunks` guard. The state is unreachable through `setChunks` now, so it is planted with
    ///      `vm.etch`: that is what an unreachable guard is for, and the test says so out loud.
    function test_lockRejectsCodelessPointer() public {
        vm.startPrank(owner);
        address ptr = app.addChunk("<p>x</p>");
        assertGt(ptr.code.length, 0);
        vm.etch(ptr, "");
        assertEq(ptr.code.length, 0);
        vm.expectRevert(abi.encodeWithSelector(App.CodelessChunk.selector, ptr));
        app.lock();
        vm.stopPrank();
        assertFalse(app.locked());
    }

    /// @dev Locking a document with no chunks at all freezes `html()` returning "" forever.
    function test_lockRejectsEmptyDocument() public {
        assertEq(app.chunkCount(), 0);
        vm.prank(owner);
        vm.expectRevert(App.EmptyDocument.selector);
        app.lock();
        assertFalse(app.locked());
    }

    /// @dev The positive control for the `lock()` precondition: a readable document still locks, and
    ///      `html()` is unchanged across the lock.
    function test_lockAcceptsReadableDocument() public {
        vm.startPrank(owner);
        app.addChunk("<p>x</p>");
        string memory docBefore = app.html();
        app.lock();
        vm.stopPrank();
        assertTrue(app.locked());
        assertEq(app.html(), docBefore);
        assertEq(app.html(), "<p>x</p>");
    }
}
