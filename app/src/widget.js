/* ═══ rake widget · __VERSION__ — the second document `App` serves. MIT. ═══

   One `eth_call` of `snapshot()`, one decoder for its return, one stylesheet. Nothing else: no
   dependency, no analytics, no demo hook, and no link unless the host asks for one. It inherits the host — font from the host, ink
   from `currentColor`, rules and muted text from `currentColor` at reduced opacity — so the only
   fixed colours are the bar's three tints, the pending amber and the error red, and every one of
   them is a literal `app/src/theme.css` carries (`test/widget.test.mjs` (c) pins that).

   Mount:

     <div data-rake="0x…"              the distribution to read
          data-chain="8453"            the chain it is on; defaults to 1
          data-rpc="https://…"         optional: read through this endpoint instead of the wallet
          data-variant="compact"       optional: bar + one line, for a footer
          data-theme="dark|light"      optional: overrides the host-luminance guess
          data-link                    optional: a "view ↗" to this distribution's page in the
                                       dapp that served this script; data-link="https://…" names
                                       another copy of the dapp
     ></div>

   Without `data-rpc` the read goes through `window.ethereum`, and only after `eth_chainId` agrees
   with `data-chain`: a wallet on another chain is a failure state, not a silent read of a different
   chain's address. Neither a `data-rpc` nor a wallet is a failure state too.

   `app/build.mjs` minifies this into `app/dist/widget.js` and refuses above 10,240 bytes. */
(function () {
'use strict';
/* `cast sig "snapshot()"` and `cast sig "setBeneficiaries((address,uint96,string,string)[])"`.
   Literals, because this file carries no keccak: `test/fixtures/abi/selectors.txt` is the oracle and
   `test/widget.test.mjs` (b) compares both against it. */
var SNAP = '0x9711715a', SETBEN = '0x8868f490';
var CHAINS = {
 '1': 'ethereum', '10': 'op mainnet', '8453': 'base', '42161': 'arbitrum', '4326': 'megaeth', '4663': 'robinhood',
 '11155111': 'sepolia', '84532': 'base sepolia', '31337': 'anvil', '31338': 'anvil 31338'
};
/* Read now: `currentScript` is null by the time a deferred mount runs. Inlined into the dapp it has no
   src, and the dapp is the page itself, query string and all — so its link stays in the same tab. */
var SRC = document.currentScript && document.currentScript.src;
var RULE = '1px solid color-mix(in srgb, currentColor 18%, transparent)';

/* One stylesheet, injected once under `#rk-css`, instead of a `style=` string per element: smaller
   than repeating the same declarations per mount, and the one thing a host cannot override by
   accident. Geometry is the exception — a segment's width is data — and it arrives as `data-w`,
   which `widths()` moves onto `flex-basis`.

   The accent and its three tints are `theme.css:76–78`'s recipe with the host's background standing
   in for `--paper`: the widget has no paper of its own, so a tint is the accent let through to
   whatever is behind the mount, which is what inheriting the host means for a fill. amber and err
   are `theme.css:6–7`'s, light and dark. */
var CSS = '.rk{font:inherit;color:inherit;--rk-ac:oklch(.47 .09 230);--rk-am:#B8741A;--rk-er:#B23A2E}'
+ '.rk.rk-dk{--rk-ac:oklch(.58 .09 230);--rk-am:#CE9640;--rk-er:#D06456}'
+ '.rk-b{display:flex;height:22px;border-radius:4px;overflow:hidden}'
+ '.rk-c .rk-b{height:14px}'
+ '.rk-w{background:repeating-linear-gradient(45deg,color-mix(in srgb, currentColor 15%, transparent) 0 6px,transparent 6px 12px)}'
+ '.rk-x{border:1px dashed var(--rk-er)}'
+ '.rk-s{flex:0 0 auto}'
+ '.rk-s0{background:color-mix(in srgb, var(--rk-ac) 100%, transparent)}'
+ '.rk-s1{background:color-mix(in srgb, var(--rk-ac) 75%, transparent)}'
+ '.rk-s2{background:color-mix(in srgb, var(--rk-ac) 50%, transparent)}'
+ '.rk-msg{font-size:12px;opacity:.5;margin-top:7px}'
+ '.rk-err{font-size:12px;color:var(--rk-er);margin-top:7px}'
+ '.rk-rt{all:unset;cursor:pointer;border-bottom:1px solid var(--rk-er);color:var(--rk-er)}'
+ '.rk-h{font-size:12.5px;font-weight:600;margin-bottom:9px}'
+ '.rk-t{margin-top:9px;font-size:12px}'
+ '.rk-r{display:flex;justify-content:space-between;gap:12px;padding:4px 0}'
+ '.rk-r>span{min-width:0}'
+ '.rk-nt{opacity:.55}'
+ '.rk-pc{font-variant-numeric:tabular-nums}'
+ '.rk-q{font-size:11px;color:var(--rk-am);margin-top:7px}'
+ '.rk-qb{display:flex;height:8px;gap:2px;margin-top:4px}'
+ '.rk-qb>div{flex:0 0 auto;border:1px solid var(--rk-am);box-sizing:border-box;border-radius:2px}'
+ '.rk-nd{font-size:11.5px;color:var(--rk-am);margin-top:8px}'
+ '.rk-1{font-size:12.5px;margin-top:7px}'
+ '.rk-dm{opacity:.5}'
+ '.rk a{color:inherit;text-decoration:none;border-bottom:1px solid currentColor}'
+ '.rk-f{margin-top:10px;padding-top:8px;border-top:' + RULE + ';font-size:10.5px;opacity:.5}';

/* The bidi controls are dropped before the four characters are escaped, and dropped rather than
   isolated: U+202A–U+202E and U+2066–U+2069 reorder what follows them, so one row's name can
   visually reverse the rest of the compact line (R15). A `<bdi>` cannot reach the `title` this
   function also feeds at `bar()`, and the dapp's `esc` does the same thing for the same reason. */
function esc(s){return String(s).replace(/[\u202A-\u202E\u2066-\u2069]/g,'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function short(a){return a.slice(0,6)+'…'+a.slice(-4)}
function pct(bps){return bps/100}
/* An unlisted chain reads as its id rather than as ethereum: the mismatch sentence below names two
   chains, and a default would make one of them a lie. */
function cname(id){return CHAINS[id]||'chain '+id}
/* The page's `delayText` rule, in the widget's idiom: one number and the largest unit that divides
   the delay exactly, so a sub-hour delay reads `10m` rather than the `0h` the rounding gave (#345). */
function fmtDelay(s){return !s?'no delay':s%86400===0?s/86400+'d':s%3600===0?s/3600+'h':s%60===0?s/60+'m':s+'s'}
function fmtEta(eta){var s=eta-Math.floor(Date.now()/1000);if(s<=0)return null;var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return d?d+'d '+h+'h':(h?h+'h '+m+'m':m+'m')}
/* `GRACE` in `src/Distribution.sol`: a matured action stays applicable for fourteen days and expires
   after that, so a row that only ever says `ready to apply` goes on claiming something the contract
   stopped allowing. The literal is deliberate — this widget is one `eth_call` by contract (:3) and a
   second read for `GRACE()` would break that — and `test/widget.test.mjs` pins it to `14 * 86400`, so
   a change to the constant fails there before it can ship a wrong sentence here. */
var GRACE=1209600;
/* #149: every judgement above and below is against `Date.now()`, the only clock a one-`eth_call`
   widget has — the dapp judges against the block timestamp, and decision 12's cost model is why this
   does not read `GRACE()` or a block for a second opinion. The clock stays; the widget says so, in
   the `title` on the queued line, and it refuses to call a change dead at the boundary: a device an
   hour fast would otherwise print `expired` over an action the contract still accepts. An hour is
   0.3% of the fourteen-day window, so being late to say `expired` costs almost nothing, where being
   early tells an owner a live change is gone. Past the hour the sentence is `expired` as before. */
var SKEW=3600;
/* Double-quoted, so the apostrophe stands in the source as itself rather than backslashed: this is
   the sentence the AC greps for, and an escape would hide it from the grep and from the next reader. */
var CLOCKNOTE="judged by this device's clock";
function etaText(eta){var left=fmtEta(eta);return left?'lands in '+left:(Math.floor(Date.now()/1000)>eta+GRACE+SKEW?'expired':'ready to apply')}
function isDark(el){
 var n=el;while(n&&n!==document.documentElement){
  var bg=getComputedStyle(n).backgroundColor,m=bg&&bg.match(/rgba?\(([^)]+)\)/);
  if(m){var p=m[1].split(',').map(parseFloat);if(p.length<4||p[3]>0){return (0.2126*p[0]+0.7152*p[1]+0.0722*p[2])/255<0.45}}
  n=n.parentElement}
 return false}

/* ---- the decoder ----------------------------------------------------------------------------- */
/* `snapshot()` returns one dynamic struct, so the return is a head word holding the offset of
   `(address,uint32,uint32,string,(address,uint96,string,string)[],(bytes32,uint256,bytes)[])` —
   `src/Distribution.sol:10–30`. `reader` binds the five primitives to one hex body; a pending
   action gets a reader of its own, which is how the same tuple-array code reads the live table and
   the queued one. Every offset in a tuple is relative to that tuple's own start. */
function reader(hex){
 var H=hex.slice(2).toLowerCase();
 function u(p){return parseInt(H.substr(p*2,64),16)}
 function adr(p){return '0x'+H.substr(p*2+24,40)}
 /* Percent-escapes then `decodeURIComponent`, so a multi-byte name arrives as the host wrote it.
    A `string` is bytes to the EVM and need not be UTF-8, and `decodeURIComponent` throws on the first
    sequence that is not — without the fallback, one bad byte in one name fails the whole mount
    ([#67](https://github.com/dnznlabs/rake/issues/67)). The fallback reads those bytes as latin1,
    which cannot throw, so the row renders mojibake and every other row still reads. */
 function txt(p){var n=u(p)*2,s='',i=0;for(;i<n;i+=2)s+='%'+H.substr(p*2+64+i,2);if(!n)return '';
  try{return decodeURIComponent(s)}catch(e){return s.replace(/%(..)/g,function(_,c){return String.fromCharCode(parseInt(c,16))})}}
 function hx(p){return '0x'+H.substr(p*2+64,u(p)*2)}
 /* A length word larger than the body has words cannot be a real array (R12): `arr` looped `u(p)`
    times against no bound, so a hostile `data-rpc` could answer with 2^32 and freeze the host tab.
    The throw lands in `decode`'s own `catch` below, which returns `null` and paints the error
    state — the same place every other unreadable answer lands. */
 function arr(p,f){var n=u(p),o=p+32,r=[],i=0;if(n>H.length/64)throw 0;for(;i<n;i++)r.push(f(o+u(o+i*32)));return r}
 function ben(p){return{account:adr(p),bps:u(p+32),name:txt(p+u(p+64)),note:txt(p+u(p+96))}}
 return{u:u,adr:adr,txt:txt,hx:hx,arr:arr,ben:ben}}

/* `null` rather than a throw, because every caller treats an unreadable answer the same way: the
   smallest `snapshot()` return is ten words, so `0x` from a codeless address never reaches a read. */
/* The hex check comes before the length check, so `reader` never slices a body that is not hex
   (R14): `reader` lower-cases and `substr`s whatever it is given, and a non-hex answer of 642 or
   more characters put four-plus-four of its own characters into `foot` as an owner. A non-hex answer
   now lands in the error state instead. */
function decode(hex){
 if(!hex||!/^0x[0-9a-fA-F]+$/.test(hex)||hex.length<642)return null;
 try{
  var r=reader(hex),b=r.u(0);
  return{
   owner:r.adr(b),delay:r.u(b+32),nonce:r.u(b+64),description:r.txt(b+r.u(b+96)),
   table:r.arr(b+r.u(b+128),r.ben),
   /* Only a `setBeneficiaries` action has a table to preview; the other three setters get the line
      and no bar, which is the dapp's rule (M02 criterion 3). */
   pending:r.arr(b+r.u(b+160),function(p){
    var act=r.hx(p+r.u(p+64)),t=null;
    if(act.slice(0,10)===SETBEN){var q=reader('0x'+act.slice(10));t=q.arr(q.u(0),q.ben)}
    return{eta:r.u(p+32),table:t}})
  }}catch(e){return null}}

/* ---- the provider ---------------------------------------------------------------------------- */
function fetchSnapshot(addr,cid,rpc,cb){
 var p={to:addr,data:SNAP};
 if(rpc){
  fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[p,'latest']})})
   .then(function(r){return r.json()}).then(function(j){cb(j&&j.result)}).catch(function(){cb(null)});
  return}
 var w=window.ethereum;
 if(!w){cb(null,'no wallet and no data-rpc — nothing to read '+short(addr)+' with');return}
 w.request({method:'eth_chainId'}).then(function(id){
  var on=parseInt(id,16);
  if(on!==parseInt(cid,10)){cb(null,'wallet is on '+cname(on)+', distribution is on '+cname(cid));return}
  return w.request({method:'eth_call',params:[p,'latest']}).then(function(hex){cb(hex)})
 }).catch(function(){cb(null)})}

/* ---- rendering ------------------------------------------------------------------------------- */
function inject(){
 if(document.getElementById('rk-css'))return;
 var s=document.createElement('style');s.id='rk-css';s.textContent=CSS;document.head.appendChild(s)}
/* A width is the one declaration that comes from the chain, so it is the one that cannot live in the
   stylesheet. `data-w` carries the finished value and this moves it, for both bars at once. */
function widths(el){var s=el.querySelectorAll('[data-w]'),i=0;for(;i<s.length;i++)s[i].style.flexBasis=s[i].getAttribute('data-w')}
function bar(table,wrap,tint,adj){
 return '<div class="'+wrap+'">'+table.map(function(b,i){
  var w=pct(b.bps);
  return '<div'+(tint?' class="rk-s rk-s'+(i%3)+'"':'')+' data-w="'+(adj?'calc('+w+'% - '+adj+'px)':w+'%')
  +'" title="'+esc(b.name||'')+' '+w+'%"></div>'}).join('')+'</div>'}
/* The error state, as a function because two callers paint it: a `data-rake` that is not an address,
   and an answer that would not decode. `text` is written escaped, and the bad-address caller passes
   a sentence with none of the attribute in it. */
function fail(el,text){
 el.innerHTML='<div class="rk-b rk-x"></div><div class="rk-err">'+esc(text)
 +' · <button class="rk-rt" data-retry>retry</button></div>';
 var r=el.querySelector('[data-retry]');if(r)r.addEventListener('click',function(){render(el)})}
function render(el){
 inject();
 var addr=el.getAttribute('data-rake')||'',cid=el.getAttribute('data-chain')||'1';
 var rpc=el.getAttribute('data-rpc'),compact=el.getAttribute('data-variant')==='compact';
 var themeAttr=el.getAttribute('data-theme'),dark=themeAttr?themeAttr==='dark':isDark(el);
 /* `classList`, not `className`: the mount is the host's element and may carry the host's classes. */
 el.classList.add('rk');el.classList.toggle('rk-c',compact);el.classList.toggle('rk-dk',dark);
 /* `data-rake` is checked for shape before anything is written (R6). `mountAll` mounts every
    `[data-rake]` in the host page, and a host that renders sanitised user HTML keeps `data-*`, so
    the attribute is not always the host's own text. The sentence carries no `short(addr)`: that
    concatenation at the footer and the `addr` in the link's `href` are the two sinks this closes,
    and naming the payload back to the reader would reopen the first of them. */
 if(!/^0x[0-9a-fA-F]{40}$/.test(addr)){fail(el,'data-rake is not an address');return}
 el.innerHTML='<div class="rk-b rk-w"></div><div class="rk-msg">reading distribution…</div>';
 fetchSnapshot(addr,cid,rpc,function(hex,why){
  var snap=decode(hex);
  if(!snap){
   fail(el,why||'could not read distribution '+short(addr)+' on '+cname(cid));
   return}
  var link=el.getAttribute('data-link');
  /* No alpha marker (ROADMAP decision 48): it is for the owner, in the dapp, not for a viewer of the
     host page. Decision 12's one outbound link is `data-link`'s, and this file promises no link
     unless the host asks. That promise covers analytics too, and a `Referer` carrying the host
     page's URL to the gateway is analytics, so the link's `rel` suppresses that as well (R21). */
  /* The scheme is an allow-list, not a denylist (R6): `data-link` went into `href` with HTML
     escaping only, so a script-scheme value became a link that runs script in the host's origin
     when clicked. `new URL` resolves a relative value against the page and throws on one it
     refuses; only `http:` and `https:` emit the `<a>` at all, so a script or data scheme — and any
     other named later — produces no link rather than a refused one. The two allowed schemes are
     named here and the refused ones are not, so step 0's grep for the refused scheme stays at zero
     and would notice a denylist if one ever appeared. */
  var href=null;
  if(link!==null){try{var u2=new URL(link||(SRC?new URL('./',SRC).href:location.href),location.href);
   if(u2.protocol==='http:'||u2.protocol==='https:')href=u2.href.split('#')[0]+'#/distros/'+addr}catch(e){}}
  var foot=(snap.delay?'delay '+fmtDelay(snap.delay):'no delay')+' · owner '+short(snap.owner)+' · '+short(addr)+' · '+esc(cname(cid))
  +(href===null?'':' · <a href="'+esc(href)+'"'+(SRC?' target="_blank" rel="noopener noreferrer"':'')+'>view ↗</a>');
  if(compact){
   el.innerHTML=bar(snap.table,'rk-b',1)
   +'<div class="rk-1">'+snap.table.map(function(b){return '<b>'+esc(b.name)+'</b> '+pct(b.bps)+'%'}).join(' · ')
   +' <span class="rk-dm">— '+foot+'</span></div>';
   widths(el);return}
  var h='<div class="rk-h">'+esc(snap.description)+'</div>'
  +bar(snap.table,'rk-b',1)
  +'<div class="rk-t">'+snap.table.map(function(b){
    return '<div class="rk-r"><span><b>'+esc(b.name)+'</b>'
    +(b.note?' <span class="rk-nt">· '+esc(b.note)+'</span>':'')
    +'</span><b class="rk-pc">'+pct(b.bps)+'%</b></div>'}).join('')+'</div>';
  snap.pending.forEach(function(p){
   h+='<div class="rk-q" title="'+CLOCKNOTE+'">a change is queued · '+(p.eta?etaText(p.eta):'ready to apply')+'</div>';
   /* The segments shrink to pay for the 2 px gaps, which keeps their proportions declarative. */
   if(p.table){var n=p.table.length;h+=bar(p.table,'rk-qb',0,((n-1)*2/n).toFixed(1))}});
  if(!snap.delay)h+='<div class="rk-nd">no delay — the owner can change this table instantly</div>';
  h+='<div class="rk-f">'+foot+'</div>';
  el.innerHTML=h;widths(el)})}

function mountAll(){for(var els=document.querySelectorAll('[data-rake]'),i=0;i<els.length;i++)render(els[i])}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAll);else mountAll();
window.RakeWidget={mount:render,refresh:mountAll};
})();
