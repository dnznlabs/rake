/* The declared shape of every value `build.mjs` substitutes into the three artifacts.

   Its own module rather than a few lines inside `build.mjs`, for the reason `app/version.mjs:10-12`
   gives for itself: `build.mjs` does its work at import, so a rule that lives there cannot be read
   by a test without running a build.

   Every shape is an allow-list, which is why there is no escaping function here and no sink changed
   for it: none of the five admits `'`, `\`, `<`, `&` or a newline, so a value that passes cannot
   break out of the `CFG` object literal (`app/src/index.html:34`) or reach the version eyebrow as
   markup. The table covers whatever the source — a `--set`, a broadcast log, or the one default —
   because `build.mjs` checks the merged values once rather than checking each source where it is
   read, which is how `--set VERSION=<img…>` used to discard `version.mjs`'s validation
   (`SECURITY.md` § Front end row R4, `audits/2026-11-17/frontend/AUDIT.md` § R4). */
import Eth from './src/eth.js';

/* An address, 20 hex bytes, in the EIP-55 casing `build.mjs:47` already writes: mixed case that is
   not the checksum is a typo, and the same address lower-cased gzips to a different size. The regex
   is the filter and the equality is the typo check — `Eth.checksum` (`app/src/eth.js:188-191`)
   lowercases and re-cases its input but passes every other character through, so it is not one. */
const ADDRESS = {
  re: /^0x[0-9a-fA-F]{40}$/,
  why: 'an address of 20 hex bytes, checksummed as EIP-55',
  ok: v => v === Eth.checksum(v),
};

/* The form `build.mjs:48` writes for a creation block: `'0x' + BigInt(n).toString(16)`, so lowercase
   and with no leading zero. A `fromBlock` is read back as a quantity, and `0x0b88091` is a typo this
   build has no way to tell from a block number. */
const BLOCK = {
  re: /^0x(0|[1-9a-f][0-9a-f]*)$/,
  why: 'a block as a minimal lowercase hex quantity',
};

/** One entry per token the three sources use, and nothing outside this table is substitutable.

   `DISTRIBUTIONFACTORY_BLOCK`'s row is the shape of *every* `__<NAME>_BLOCK__`: they are all written
   by the one line in `deployed()`, so one row states the form rather than a row per contract that
   might ever be deployed. `shapeOf` is where that applies. */
export const SHAPES = {
  /* A decimal chain id: `CFG.chainId` is compared as a string (`index.html:115`) and parsed with
     `Number` (`:164`), so a `0x`-prefixed id would compare unequal to both and parse to 0. */
  CHAIN_ID: { re: /^[1-9][0-9]{0,9}$/, why: 'a decimal chain id with no leading zero' },
  /* The page string `marked()` produces (`version.mjs:41`): `v?<major>.<minor>` minus the `v`, plus
     the marker. A `--set VERSION=` has to supply the same shape, so no markup and no quote can reach
     the `CFG` literal at `index.html:34` or the version eyebrow at `:1978`. */
  VERSION: { re: /^[0-9]+\.[0-9]+[a-z]{0,8}$/, why: "'<major>.<minor>' plus an optional marker word" },
  DISTRIBUTIONFACTORY: ADDRESS,
  APP: ADDRESS,
  DISTRIBUTION: ADDRESS,
  DISTRIBUTIONFACTORY_BLOCK: BLOCK,
  /* 32 bytes: the salts `mk/15-seed.mk:9-10` passes. */
  FEATURED_SALT: { re: /^0x[0-9a-fA-F]{64}$/, why: '32 hex bytes' },
  /* A subresource integrity value for the widget, computed by `app/build.mjs` from the file it just
     wrote. It is written into an HTML attribute in the `#/docs` snippet, so the shape is narrow on
     purpose: `sha384-` and base64 alone, which cannot carry a quote and so cannot end the attribute
     early. Exactly 64 base64 characters plus padding is what a 48-byte digest is; a wider pattern
     would admit a truncated hash, which would fail only in a visitor's browser. */
  WIDGET_SRI: { re: /^sha384-[A-Za-z0-9+/]{64}={0,2}$/, why: "'sha384-' and the base64 of a 48-byte digest" },
};

/** The declared shape of `key`, or `undefined` where none is declared. */
export const shapeOf = key =>
  SHAPES[key] || (key.endsWith('_BLOCK') ? SHAPES.DISTRIBUTIONFACTORY_BLOCK : undefined);

/** `values` unchanged, or one error naming every token that failed, where it came from and the shape
   it failed. `sources` maps a token to the words for its origin — `--set`, the log file it was read
   from, or the default; a token `sources` does not name is reported as the default, which is the only
   value `build.mjs` supplies without a source of its own.

   A token with no `SHAPES` row fails closed rather than passing unchecked: a new `__NAME__` in the
   sources is a new value in the document, and the point of this module is that there is no such
   thing as an unchecked one. */
export function check(values, sources = {}) {
  const bad = [];
  for (const k of Object.keys(values)) {
    const shape = shapeOf(k);
    if (!shape) {
      bad.push(`no shape declared for __${k}__ — add one to app/values.mjs`);
      continue;
    }
    const v = values[k];
    if (typeof v !== 'string' || !shape.re.test(v) || (shape.ok && !shape.ok(v))) {
      bad.push(`__${k}__ is ${JSON.stringify(v)} from ${sources[k] || 'the default'}, `
        + `which is not ${shape.why} (${shape.re})`);
    }
  }
  if (bad.length) {
    throw new Error(
      `build: ${bad.length} value${bad.length === 1 ? '' : 's'} this build would substitute `
      + `${bad.length === 1 ? 'does' : 'do'} not have the shape declared for it:\n`
      + bad.map(b => '       ' + b).join('\n') + '\n'
      + '       Every shape is in app/values.mjs § SHAPES, with the reason it is no wider.',
    );
  }
  return values;
}
