/* m04-t05 step 4's instrument: the `eth_getLogs` one load of a distribution route costs through the
   wallet's own RPC, and the time until the three sections stop saying they are loading. Paste into
   DevTools on the landing, after it loads and before opening the route. The served document is a
   `nodev` build, so the page's own `self.__LOGREQ` is stripped (`app/build.mjs:102`) and this wrap is
   the only counter there is. Its one unverifiable assumption is that the provider the page captured
   at load — first EIP-6963 announce, else `window.ethereum` (`app/src/index.html:102-107`) — is this
   `window.ethereum`; the detector is built in, since `eth_getLogs: 0` beside painted sections means
   the wrap missed it and the extension's panel is the fallback. `firstLoad` is sessionStorage's. */
(() => {
  const P = window.ethereum;
  if (!P) return console.log('count.js: no window.ethereum on this page');
  const KEY = 'uat.count.js';
  const u = { chainId: null, head: null, eth_getLogs: 0, msToPainted: null, firstLoad: !sessionStorage.getItem(KEY) };
  sessionStorage.setItem(KEY, '1');
  window.__uat = u;
  /* Counted on dispatch, not on resolution: a refusal the page retries is still a request made.
     `head` is the one the page reads per load (`index.html:231-232`), the block tag of the reading. */
  const inner = P.request.bind(P);
  P.request = args => {
    const m = args && args.method;
    if (m === 'eth_getLogs') u.eth_getLogs++;
    const p = inner(args);
    if (m === 'eth_blockNumber') p.then(r => { if (u.head == null) u.head = parseInt(r, 16); }, () => {});
    return p;
  };
  inner({ method: 'eth_chainId' }).then(r => { u.chainId = parseInt(r, 16); }, () => {});
  /* Painted = none of the three containers (`index.html:1361-1363`) still carries its loading notice.
     The text, not the class: `partialLine()` is a `.notice` too and a section offering `load older`
     has painted; a container not yet in the DOM has not. */
  const IDS = ['funds', 'h-changes', 'h-funds'];
  const LOADING = /^(loading…|reading the balances and the escrow…)$/;
  const stillLoading = () => IDS.some(id => {
    const el = document.getElementById(id);
    return !el || [...el.querySelectorAll('.notice')].some(n => LOADING.test(n.textContent.trim()));
  });

  /* A hash navigation does not reload, so the clock starts at `hashchange`; a later navigation takes
     the clock off the earlier one rather than reporting whichever settled first. */
  let t0 = null;
  addEventListener('hashchange', () => {
    const mine = (t0 = performance.now());
    u.msToPainted = null;
    const tick = () => {
      if (t0 !== mine) return;
      const waited = Math.round(performance.now() - mine);
      if (stillLoading()) return waited > 120000 ? report(`timeout at ${waited}`) : void setTimeout(tick, 50);
      report(waited);
    };
    tick();
  });

  /* A copy: `window.__uat` keeps counting, so row (e)'s `load older` delta is read off it, while the
     object in the console stays the figure this load painted with. */
  function report(ms) {
    u.msToPainted = ms;
    if (!u.eth_getLogs) u.missedProvider = 'eth_getLogs 0 with sections painted — use the extension panel';
    console.log({ ...u });
  }
})();
