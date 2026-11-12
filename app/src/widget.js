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
 '1': 'ethereum', '10': 'op mainnet', '8453': 'base', '42161': 'arbitrum',
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

function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function short(a){return a.slice(0,6)+'…'+a.slice(-4)}
function pct(bps){return bps/100}
/* An unlisted chain reads as its id rather than as ethereum: the mismatch sentence below names two
   chains, and a default would make one of them a lie. */
function cname(id){return CHAINS[id]||'chain '+id}
function fmtDelay(s){if(!s)return 'no delay';var d=Math.floor(s/86400),h=Math.round(s%86400/3600);return d?d+'d'+(h?' '+h+'h':''):h+'h'}
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
 function arr(p,f){var n=u(p),o=p+32,r=[],i=0;for(;i<n;i++)r.push(f(o+u(o+i*32)));return r}
 function ben(p){return{account:adr(p),bps:u(p+32),name:txt(p+u(p+64)),note:txt(p+u(p+96))}}
 return{u:u,adr:adr,txt:txt,hx:hx,arr:arr,ben:ben}}

/* `null` rather than a throw, because every caller treats an unreadable answer the same way: the
   smallest `snapshot()` return is ten words, so `0x` from a codeless address never reaches a read. */
function decode(hex){
 if(!hex||hex.length<642)return null;
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
function render(el){
 inject();
 var addr=el.getAttribute('data-rake')||'',cid=el.getAttribute('data-chain')||'1';
 var rpc=el.getAttribute('data-rpc'),compact=el.getAttribute('data-variant')==='compact';
 var themeAttr=el.getAttribute('data-theme'),dark=themeAttr?themeAttr==='dark':isDark(el);
 /* `classList`, not `className`: the mount is the host's element and may carry the host's classes. */
 el.classList.add('rk');el.classList.toggle('rk-c',compact);el.classList.toggle('rk-dk',dark);
 el.innerHTML='<div class="rk-b rk-w"></div><div class="rk-msg">reading distribution…</div>';
 fetchSnapshot(addr,cid,rpc,function(hex,why){
  var snap=decode(hex);
  if(!snap){
   el.innerHTML='<div class="rk-b rk-x"></div><div class="rk-err">'
   +esc(why||'could not read distribution '+short(addr)+' on '+cname(cid))
   +' · <button class="rk-rt" data-retry>retry</button></div>';
   var r=el.querySelector('[data-retry]');if(r)r.addEventListener('click',function(){render(el)});
   return}
  var link=el.getAttribute('data-link');
  /* ROADMAP decision 45: the word, and no anchor to carry it — decision 12's one outbound link is
     `data-link`'s, and this file promises no link unless the host asks. On `foot` because both
     variants paint `foot`, so the compact bar cannot be the one that omits it. */
  var foot='alpha · '+(snap.delay?'delay '+fmtDelay(snap.delay):'no delay')+' · owner '+short(snap.owner)+' · '+short(addr)+' · '+esc(cname(cid))
  +(link===null?'':' · <a href="'+esc((link||(SRC?new URL('./',SRC).href:location.href)).split('#')[0]+'#/distros/'+addr)+'"'+(SRC?' target="_blank" rel="noopener"':'')+'>view ↗</a>');
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
