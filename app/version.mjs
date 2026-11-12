/* The page's version string: `App`'s own constructor argument plus the alpha marker (ROADMAP
   decision 45).

   "Alpha" is a marker, not a version in the contract. `App.version` is a constructor argument that
   feeds `App`'s CREATE2 address, so it stays `v0.1` and no `src/` byte moves to mark or unmark a
   release; the page string is derived from that argument instead of being hardcoded beside it, which
   is what makes removing the marker a chunk re-upload and not a redeploy. One leading `v` comes off
   and the marker goes on: `v0.1` → `0.1alpha`.

   Its own module rather than a few lines inside `build.mjs`, for the reason `inline-scripts.mjs` is
   one: `build.mjs` does its work at import, so a derivation that lives there cannot be read by a
   test without running a build. */

/** Appended to the argument, and the one place the word is spelled for the page. */
export const MARKER = 'alpha';

/* `v?<major>.<minor>` and nothing else. Deliberately narrow: this matches what `DeployApp.s.sol`
   passes today, and anything else is a deploy whose version nobody has explained yet. */
const SHAPE = /^v?\d+\.\d+$/;

/** The page's version string for `App`'s `version` argument, or `null` when the log offers none —
   in which case `build.mjs` has nothing to substitute and refuses by name, as it does for every
   other unresolved token.

   Throws on an argument that does not match `SHAPE`, and throws rather than letting `--set
   VERSION=…` paper over it: `--set` exists so a chain with no log can still be built deliberately,
   and a log that *does* exist but says something unexpected about the deployed `App` is a question
   about the deploy, which an override would answer by painting a version nobody checked onto the
   footer and the docs eyebrow of a bundle about to be uploaded to a chain. */
export function marked(arg) {
  if (arg == null || arg === '') return null;
  if (!SHAPE.test(arg)) {
    throw new Error(
      `build: App's version argument is ${JSON.stringify(arg)}, which is not v<major>.<minor>.\n`
      + `       The page's version string is that argument with one leading 'v' removed and `
      + `'${MARKER}' appended\n`
      + '       (ROADMAP decision 45). A version this does not recognise is a question for the\n'
      + '       deploy, not a string to ship: fix the deploy, or the log this build is reading.',
    );
  }
  return arg.replace(/^v/, '') + MARKER;
}
