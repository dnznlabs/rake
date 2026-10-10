/* Keccak-256 and the ABI subset the dapp needs. No dependencies.
   Inlined into index.html by build.mjs, which also imports it to checksum addresses. */
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
  const pad = v => BigInt(v).toString(16).padStart(64, '0');
  /** Static arguments only: every argument is encoded as one word. */
  const enc = (sig, args = []) => '0x' + sel(sig) + args.map(pad).join('');
  const addr = v => '0x' + v.toString(16).padStart(40, '0');
  /** Decodes static types, `string`, and arrays of static types. */
  function dec(types, hex) {
    const d = (hex || '0x').replace(/^0x/, ''), word = i => BigInt('0x' + (d.substr(i * 64, 64) || '0'));
    const one = (t, v) => t === 'bool' ? v !== 0n : t === 'address' ? addr(v) : t.startsWith('int') ? (v >= (1n << 255n) ? v - (1n << 256n) : v) : v;
    return types.map((t, i) => {
      if (t !== 'string' && !t.endsWith('[]')) return one(t, word(i));
      const off = Number(word(i)) / 32, len = Number(word(off));
      if (t === 'string') return new TextDecoder().decode(hexBytes(d.substr((off + 1) * 64, len * 2)));
      const base = t.slice(0, -2), arr = [];
      for (let j = 0; j < len; j++) arr.push(one(base, word(off + 1 + j)));
      return arr;
    });
  }
  /** EIP-55. */
  function checksum(a) {
    const low = a.replace(/^0x/, '').toLowerCase(), h = keccak(utf8(low));
    return '0x' + [...low].map((c, i) => parseInt(h[i], 16) >= 8 ? c.toUpperCase() : c).join('');
  }

  return { keccak, utf8, hexBytes, sel, pad, enc, addr, dec, checksum };
})();
export default Eth;
