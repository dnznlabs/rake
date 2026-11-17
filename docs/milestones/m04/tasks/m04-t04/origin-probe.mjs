#!/usr/bin/env node
// m04-t04 step 3 — can a wallet reach the document the hosted gateway serves?
//
// Evidence of this task, not a tool of the repo: it answers the three expressions m04-t02 left
// pending for a real origin, and it lives beside that task's TASK.md rather than in tools/.
//
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core \
//     node docs/milestones/m04/tasks/m04-t04/origin-probe.mjs https://<app>.<chainId>.w3link.io/
//
// `playwright-core` is read from PLAYWRIGHT_CORE — a directory outside the repo, so no dependency
// of ours moves — and drives the cached chromium, which CHROMIUM may override.
//
// Every frame of the page is reported, the main one first. A document is only reachable by a wallet
// if it is the top frame of a real origin: `window.top === window` false, or a `location.origin` of
// `"null"`, is the state M04 risk 2 feared, and naming the frame is how the answer stays checkable
// when the URL is a page that wraps ours.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const url = process.argv[2];
const core = process.env.PLAYWRIGHT_CORE;
const exe = process.env.CHROMIUM
  || '/home/openclaw/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome';
const settle = Number(process.env.SETTLE_MS || 4000);

if (!url || !core) {
  console.error('usage: PLAYWRIGHT_CORE=<dir> node origin-probe.mjs <url>');
  process.exit(2);
}

const { chromium } = require(core);
const pkg = require(`${core}/package.json`);

// The expressions, run inside whichever frame is asked. `innerText` is cut at 160 characters: it is
// here to show the page painted, not to assert its copy.
const PROBE = () => ({
  top: window.top === window,
  ethereum: typeof window.ethereum,
  origin: location.origin,
  title: document.title,
  text: (document.body ? document.body.innerText : '').slice(0, 160).replace(/\s+/g, ' ').trim(),
});

const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

console.log(`origin-probe ${url}`);
console.log(`  read ${new Date().toISOString()} · ${browser.version()} · playwright-core ${pkg.version}`);

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(settle); // the dapp reads the chain after load; let it paint

const frames = page.frames();
for (const [i, frame] of frames.entries()) {
  const r = await frame.evaluate(PROBE);
  console.log(`frame ${i}${i === 0 ? ' (main)' : ''} ${frame.url()}`);
  console.log(`  window.top === window   : ${r.top}`);
  console.log(`  typeof window.ethereum  : ${JSON.stringify(r.ethereum)}`);
  console.log(`  location.origin         : ${r.origin}`);
  console.log(`  document.title          : ${JSON.stringify(r.title)}`);
  console.log(`  body.innerText[0,160]   : ${JSON.stringify(r.text)}`);
}

console.log(`pageerrors: ${errors.length}`);
for (const e of errors) console.log(`  pageerror: ${e}`);

await browser.close();
