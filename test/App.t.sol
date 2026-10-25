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

    /// @dev The second resource through the ERC-5219 door: the chunks concatenate the same way the
    ///      dapp's do, and the header is the one a `<script src>` needs. A gateway that served the
    ///      widget as text/html would make the script tag inert, so the value is pinned whole.
    function test_requestWidget() public {
        vm.startPrank(owner);
        app.addChunk("<p>x</p>");
        app.addWidgetChunk("(function(){");
        app.addWidgetChunk("})();");
        vm.stopPrank();
        assertEq(app.widget(), "(function(){})();");
        assertEq(app.widgetChunkCount(), 2);
        string[] memory res = new string[](1);
        res[0] = "widget.js";
        App.KeyValue[] memory params = new App.KeyValue[](0);
        (uint16 code, string memory body, App.KeyValue[] memory hdr) = app.request(res, params);
        assertEq(code, 200);
        assertEq(body, "(function(){})();");
        assertEq(hdr.length, 1);
        assertEq(hdr[0].key, "Content-Type");
        assertEq(hdr[0].value, "application/javascript; charset=utf-8");
    }

    /// @dev An `App` with the dapp and no widget is a complete site, not a half-deployed one: the
    ///      widget path is a plain 404 and the root is untouched. This is the state every deploy
    ///      passes through between `setChunks` and `setWidgetChunks`.
    function test_requestWidgetAbsent() public {
        vm.prank(owner);
        app.addChunk("<p>x</p>");
        assertEq(app.widgetChunkCount(), 0);
        string[] memory res = new string[](1);
        res[0] = "widget.js";
        App.KeyValue[] memory params = new App.KeyValue[](0);
        (uint16 code, string memory body, App.KeyValue[] memory hdr) = app.request(res, params);
        assertEq(code, 404);
        assertEq(body, "");
        assertEq(hdr.length, 0);
        res = new string[](0);
        (code, body,) = app.request(res, params);
        assertEq(code, 200);
        assertEq(body, "<p>x</p>");
    }

    /// @dev The gzip flag belongs to the dapp alone. A `<script src="widget.js">` cannot run an HTML
    ///      document that inflates itself, so the widget has to come back byte-for-byte even when the
    ///      dapp beside it is wrapped — the one configuration where a shared code path would show.
    function test_widgetIsNeverWrapped() public {
        vm.startPrank(owner);
        address p = app.addChunk(hex"1f8b0800");
        address[] memory ptrs = new address[](1);
        ptrs[0] = p;
        app.setChunks(ptrs, true);
        app.addWidgetChunk("(function(){'use strict'})();");
        vm.stopPrank();
        assertTrue(app.gzipped());
        assertTrue(LibString.contains(app.html(), "DecompressionStream"));
        string memory w = app.widget();
        assertEq(w, "(function(){'use strict'})();");
        assertFalse(LibString.contains(w, "DecompressionStream"));
        assertFalse(LibString.contains(w, "DOMParser"));
        string[] memory res = new string[](1);
        res[0] = "widget.js";
        (, string memory body,) = app.request(res, new App.KeyValue[](0));
        assertEq(body, w);
    }

    /// @dev `lock()` is one door over two lists: whatever it freezes for the dapp it freezes for the
    ///      widget, or a locked `App` would still be rewritable through the second resource.
    function test_lockCoversWidget() public {
        vm.startPrank(owner);
        address w = app.addWidgetChunk("(function(){})();");
        app.addChunk("<p>x</p>");
        app.lock();
        vm.expectRevert(App.Locked.selector);
        app.addWidgetChunk("x");
        address[] memory ptrs = new address[](1);
        ptrs[0] = w;
        vm.expectRevert(App.Locked.selector);
        app.setWidgetChunks(ptrs);
        vm.stopPrank();
        assertEq(app.widgetChunkCount(), 1);
    }

    /// @dev The same unreachable state `test_lockRejectsCodelessPointer` plants for the dapp, planted
    ///      in the widget list: `lock()` re-reads both, so a codeless widget pointer stops the one-way
    ///      door rather than being frozen behind it. `vm.etch` is the only way in.
    function test_lockRejectsCodelessWidgetPointer() public {
        vm.startPrank(owner);
        app.addChunk("<p>x</p>");
        address ptr = app.addWidgetChunk("(function(){})();");
        assertGt(ptr.code.length, 0);
        vm.etch(ptr, "");
        assertEq(ptr.code.length, 0);
        vm.expectRevert(abi.encodeWithSelector(App.CodelessChunk.selector, ptr));
        app.lock();
        vm.stopPrank();
        assertFalse(app.locked());
    }

    /// @dev The widget is optional, so `EmptyDocument` stays a question about the dapp. Without this
    ///      the natural reading of "lock checks both lists" would make every widgetless deploy
    ///      unlockable, and nothing above would fail.
    function test_lockAcceptsDappWithoutWidget() public {
        vm.startPrank(owner);
        app.addChunk("<p>x</p>");
        assertEq(app.widgetChunkCount(), 0);
        app.lock();
        vm.stopPrank();
        assertTrue(app.locked());
        assertEq(app.html(), "<p>x</p>");
        assertEq(app.widget(), "");
    }

    /// @dev `setWidgetChunks` takes its pointers from calldata, so the `SSTORE2.read` memory blow-up
    ///      `test_setChunksRejectsCodelessPointer` describes is reachable here too — through
    ///      `widget()` and the widget.js route instead of `html()`.
    function test_setWidgetChunksRejectsCodelessPointer() public {
        address codeless = makeAddr("codelessWidget");
        assertEq(codeless.code.length, 0);
        address[] memory ptrs = new address[](1);
        ptrs[0] = codeless;
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(App.CodelessChunk.selector, codeless));
        app.setWidgetChunks(ptrs);
    }

    /// @dev An empty list is a mistake rather than a way to remove the widget: the widget is dropped
    ///      by never uploading one, which `test_requestWidgetAbsent` pins, not by emptying the list.
    function test_setWidgetChunksRejectsEmptyList() public {
        address[] memory ptrs = new address[](0);
        vm.prank(owner);
        vm.expectRevert(App.EmptyDocument.selector);
        app.setWidgetChunks(ptrs);
    }

    /// @dev The positive control for both `setWidgetChunks` guards: a well-formed list goes through
    ///      and the widget it produces is byte-identical to the one `addWidgetChunk` served before the
    ///      pointers were re-set. Without it a guard that rejected everything would pass the two above.
    function test_setWidgetChunksAcceptsValidPointers() public {
        vm.startPrank(owner);
        address a = app.addWidgetChunk("(function(){");
        address b = app.addWidgetChunk("})();");
        string memory widgetBefore = app.widget();
        address[] memory ptrs = new address[](2);
        ptrs[0] = a;
        ptrs[1] = b;
        app.setWidgetChunks(ptrs);
        vm.stopPrank();
        assertEq(app.widgetChunkCount(), 2);
        assertEq(app.widget(), widgetBefore);
        assertEq(app.widget(), "(function(){})();");
    }
}
