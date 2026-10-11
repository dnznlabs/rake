/* Keccak-256 and a general ABI codec. No dependencies.
   Inlined into index.html by build.mjs, which also imports it to checksum addresses.
   The codec is proved byte-equal to `cast` by test/abi.test.mjs against the fixtures
   tools/abi-vectors.sh writes; it is never compared against itself. */
const Eth = (() => {
  const M64 = (1n << 64n) - 1n;
  const RC = [0x1n,0x8082n,0x800000000000808an,0x8000000080008000n,0x808bn,0x80000001n,0x8000000080008081n,0x8000000000008009n,0x8an,0x88n,0x80008009n,0x8000000an,0x8000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x80000001n,0x8000000080008008n];
  const RO = [[0,36,3,41,18],[1,44,10,45,2],[62,6,43,15,61],[28,55,25,21,56],[27,20,39,8,14]];
  const rot = (v, n) => n === 0 ? v : (((v << BigInt(n)) | (v >> BigInt(64 - n))) & M64);
  function keccakF(st) {
    for (let r = 0; r < 24; r++) {
      const C = [];
      for (let x = 0; x < 5; x++) C[x] = st[x] ^ st[x + 5] ^ st[x + 10] ^ st[x + 15] ^ st[x + 20];
      for (let x = 0; x < 5; x++) { const D = C[(x + 4) % 5] ^ rot(C[(x + 1) % 5], 1); for (let y = 0; y < 25; y += 5) st[x + y] ^= D; }
      const B = new Array(25);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rot(st[x + 5 * y], RO[x][y]);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) st[x + 5 * y] = B[x + 5 * y] ^ ((~B[(x + 1) % 5 + 5 * y] & M64) & B[(x + 2) % 5 + 5 * y]);
      st[0] ^= RC[r];
    }
  }
  /** keccak256 of a Uint8Array → 32-byte hex without 0x */
  function keccak(bytes) {
    const rate = 136, st = new Array(25).fill(0n);
    const padded = new Uint8Array(Math.ceil((bytes.length + 1) / rate) * rate);
    padded.set(bytes); padded[bytes.length] |= 0x01; padded[padded.length - 1] |= 0x80;
    for (let off = 0; off < padded.length; off += rate) {
      for (let i = 0; i < 17; i++) { let l = 0n; for (let b = 7; b >= 0; b--) l = (l << 8n) | BigInt(padded[off + i * 8 + b]); st[i] ^= l; }
      keccakF(st);
    }
    let out = '';
    for (let i = 0; i < 4; i++) { let l = st[i]; for (let b = 0; b < 8; b++) { out += (Number(l & 0xffn)).toString(16).padStart(2, '0'); l >>= 8n; } }
    return out;
  }
  const utf8 = s => new TextEncoder().encode(s);
  const hexBytes = h => { h = h.replace(/^0x/, ''); const u = new Uint8Array(h.length / 2); for (let i = 0; i < u.length; i++) u[i] = parseInt(h.substr(i * 2, 2), 16); return u; };

  const sel = sig => keccak(utf8(sig)).slice(0, 8);
  const W = 1n << 256n;
  /** One ABI word of hex, two's complement, so a negative int encodes like solc's. */
  const pad = v => (((BigInt(v) % W) + W) % W).toString(16).padStart(64, '0');
  const addr = v => '0x' + v.toString(16).padStart(40, '0');
  /** Hex of a byte string with no 0x and no case: cast's fixtures are lowercase. */
  const raw = h => String(h == null ? '' : h).replace(/^0x/, '').toLowerCase();
  const hx = b => { let s = ''; for (const x of b) s += x.toString(16).padStart(2, '0'); return s; };

  /* ---- the type grammar ---------------------------------------------------------------------
     Three shapes compose: a tuple `(T,…)`, an array `T[]` or `T[k]`, and an elementary type. A
     type is dynamic when its length is not fixed by the type alone, and the head/tail split below
     turns on exactly that. */

  /** Splits a parameter list on its top-level commas, so nested tuples and arrays stay whole. */
  function split(list) {
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === ',' && depth === 0) { out.push(list.slice(start, i).trim()); start = i + 1; }
    }
    const last = list.slice(start).trim();
    if (last) out.push(last);
    return out;
  }
  /** The parameter types of a signature: `f(uint32,(address,uint96)[])` → two entries. */
  const params = sig => split(sig.slice(sig.indexOf('(') + 1, sig.lastIndexOf(')')));
  /** `[element, count]` for an array type; count is -1 when dynamic, 0 when this is not an array. */
  function arr(t) {
    if (t.charAt(t.length - 1) !== ']') return ['', 0];
    const open = t.lastIndexOf('[');
    const n = t.slice(open + 1, -1);
    return [t.slice(0, open), n === '' ? -1 : Number(n)];
  }
  /** Member types of a tuple type, or null. Arrays are tested first: `(a,b)[]` is an array. */
  const members = t => t.charAt(0) === '(' && t.charAt(t.length - 1) === ')' ? split(t.slice(1, -1)) : null;

  function dynamic(t) {
    const [el, n] = arr(t);
    if (n) return n < 0 || dynamic(el);
    if (t === 'string' || t === 'bytes') return true;
    const m = members(t);
    return m ? m.some(dynamic) : false;
  }
  /** Bytes a static type occupies in a head; dynamic types always occupy one word there. */
  function width(t) {
    const [el, n] = arr(t);
    if (n > 0) return n * width(el);
    const m = members(t);
    return m ? m.reduce((s, x) => s + width(x), 0) : 32;
  }

  /* ---- encoding ------------------------------------------------------------------------------ */

  /** A length-prefixed byte string, right-padded to a whole number of words. */
  const blob = h => pad(h.length / 2) + h + '0'.repeat((64 - h.length % 64) % 64);

  /** Encodes one value, with any offsets inside it relative to its own first byte. */
  function encOne(t, v) {
    const [el, n] = arr(t);
    if (n) {
      if (n > 0 && v.length !== n) throw new Error(`eth: ${t} takes ${n} elements, got ${v.length}`);
      return (n < 0 ? pad(v.length) : '') + encList(new Array(v.length).fill(el), v);
    }
    const m = members(t);
    if (m) {
      if (v.length !== m.length) throw new Error(`eth: ${t} takes ${m.length} members, got ${v.length}`);
      return encList(m, v);
    }
    if (t === 'string') return blob(hx(utf8(v)));
    if (t === 'bytes') return blob(raw(v));
    if (t.startsWith('bytes')) return raw(v).padEnd(64, '0');
    if (t === 'bool') return pad(v ? 1 : 0);
    return pad(v);
  }

  /** The head/tail encoding of a list of types: static values inline, dynamic ones by offset. */
  function encList(types, vals) {
    let head = '', tail = '';
    const headLen = types.reduce((s, t) => s + (dynamic(t) ? 32 : width(t)), 0);
    types.forEach((t, i) => {
      const e = encOne(t, vals[i]);
      if (dynamic(t)) { head += pad(headLen + tail.length / 2); tail += e; }
      else head += e;
    });
    return head + tail;
  }

  /** Calldata for `sig`. Throws rather than pad: a short argument list is a bug, not a zero. */
  function enc(sig, args = []) {
    const types = params(sig);
    if (types.length !== args.length) {
      throw new Error(`eth: ${sig} takes ${types.length} arguments, got ${args.length}`);
    }
    return '0x' + sel(sig) + encList(types, args);
  }

  /* ---- decoding ------------------------------------------------------------------------------ */

  const wordAt = (d, at) => BigInt('0x' + (d.substr(at * 2, 64) || '0'));

  /** Reads one value at an absolute byte offset. Tuples and arrays come back as nested arrays. */
  function decOne(t, d, at) {
    const [el, n] = arr(t);
    if (n) {
      const len = n < 0 ? Number(wordAt(d, at)) : n;
      return decList(new Array(len).fill(el), d, n < 0 ? at + 32 : at);
    }
    const m = members(t);
    if (m) return decList(m, d, at);
    if (t === 'string' || t === 'bytes') {
      const h = d.substr((at + 32) * 2, Number(wordAt(d, at)) * 2);
      return t === 'bytes' ? '0x' + h : new TextDecoder().decode(hexBytes(h));
    }
    if (t.startsWith('bytes')) return '0x' + d.substr(at * 2, Number(t.slice(5)) * 2);
    const v = wordAt(d, at);
    if (t === 'bool') return v !== 0n;
    if (t === 'address') return checksum(addr(v));
    if (t.startsWith('int')) return v >= (1n << 255n) ? v - W : v;
    return v;
  }

  function decList(types, d, base) {
    let at = 0;
    return types.map(t => {
      if (dynamic(t)) { const p = Number(wordAt(d, base + at)); at += 32; return decOne(t, d, base + p); }
      const v = decOne(t, d, base + at);
      at += width(t);
      return v;
    });
  }

  /** Decodes a return value or an argument list. Numbers are BigInt, addresses checksummed. */
  const dec = (types, hex) => decList(types, raw(hex), 0);

  /** The arguments of calldata whose selector is `sel(sig)`, or null when it is some other call. */
  function decCall(sig, hex) {
    const d = raw(hex);
    if (d.slice(0, 8) !== sel(sig)) return null;
    return dec(params(sig), d.slice(8));
  }

  /** EIP-55. */
  function checksum(a) {
    const low = a.replace(/^0x/, '').toLowerCase(), h = keccak(utf8(low));
    return '0x' + [...low].map((c, i) => parseInt(h[i], 16) >= 8 ? c.toUpperCase() : c).join('');
  }

  return { keccak, utf8, hexBytes, sel, pad, enc, addr, dec, decCall, checksum };
})();
export default Eth;
