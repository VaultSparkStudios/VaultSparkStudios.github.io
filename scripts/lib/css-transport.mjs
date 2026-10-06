import { transformSync } from 'esbuild';

/** Compact only browser artifacts; retain readable source and every CSS rule.
 * esbuild is already installed and locked as part of the Wrangler toolchain.
 * Syntax and identifier minification stay disabled: this changes transport
 * whitespace/comments, never property values, selector choices or rule order.
 */
export function compactCssTransport(source) {
  // esbuild's whitespace pass can merge custom-property tokens around an
  // embedded comment (1/**/px becomes 1px). Conservatively keep such a sheet
  // verbatim, including comment-looking strings, rather than change meaning.
  if (/\S\/\*[\s\S]*?\*\/\S/.test(source)) return source;
  return transformSync(source, {
    loader: 'css',
    minifyWhitespace: true,
    minifySyntax: false,
    minifyIdentifiers: false,
    legalComments: 'none',
  }).code.trimEnd();
}
