/* Every <script> in the built document must be inline and attribute-free.

   A contract-hosted document is inflated and swapped in with DOMParser, and each script is then
   re-created so it runs. That preserves document order only for inline, attribute-free scripts: `src`
   becomes fetch order, `type="module"` and `defer` become deferred execution, and in each case the page
   still renders and the app never runs. So the build refuses the bundle instead. */

/** Every <script> open tag, with its attribute text. Quote-aware: an attribute value may hold `>`. */
export function scriptTags(html) {
  const tags = [];
  /* Case-insensitive: `<SCRIPT src="app.js">` and `<Script defer>` are a real external script and a
     real deferred one, and the case-sensitive `indexOf` scan this replaces saw neither, so the build shipped
     a bundle that renders and never runs — the one thing this module exists to refuse (R11,
     `audits/2026-11-17/frontend/AUDIT.md:305-320`). The lookahead is the name check that used to be
     a separate test on the next character: `<scriptable>` is not a script tag, because the name has
     to end at the tag. */
  const open = /<script(?=[\s/>])/gi;
  for (let m = open.exec(html); m !== null; m = open.exec(html)) {
    const i = m.index;
    let quote = null;
    let j = i + 7;
    for (; j < html.length; j++) {
      const c = html[j];
      if (quote) { if (c === quote) quote = null; } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    tags.push({
      attrs: html.slice(i + 7, j).replace(/\/$/, '').trim(),
      line: html.slice(0, i).split('\n').length,
    });
  }
  return tags;
}

/** Throws unless every script tag is a bare `<script>`. `label` names the artifact in the message. */
export function assertInlineScripts(html, label = 'bundle') {
  const bad = scriptTags(html).filter(t => t.attrs !== '');
  if (!bad.length) return;
  const list = bad.map(t => `  line ${t.line}: <script ${t.attrs}>`).join('\n');
  throw new Error(
    `${label}: ${bad.length} of ${scriptTags(html).length} <script> tags carry attributes:\n${list}\n`
    + 'A contract-hosted document re-creates each script after a DOMParser swap and relies on inline,\n'
    + 'attribute-free scripts executing in insertion order. An attribute breaks that silently: the\n'
    + 'document renders and the app never runs. Inline the script instead.',
  );
}
