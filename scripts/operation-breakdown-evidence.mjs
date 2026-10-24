import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
function load(path) {
  const filename = resolve(path);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod = new Module(filename); mod.filename = filename; mod.paths = require.resolve.paths('react'); mod._compile(code, filename); return mod.exports;
}
const {OperationBreakdownChart} = load('src/components/operation-breakdown-chart.tsx');
const {demoTransactions} = load('src/demo/data.ts');
const css = readFileSync('src/app/globals.css','utf8').replace('@import "tailwindcss";', '');
const fonts = [400,600,700].map(weight => `@font-face{font-family:'IBM Plex Sans Arabic';font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(`node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-${weight}-normal.woff2`).toString('base64')})} `).join('');
for (const locale of ['ar','en']) {
 const chart = renderToStaticMarkup(createElement(OperationBreakdownChart,{rows:demoTransactions,locale}));
 writeFileSync(`docs/reviews/2026-10-20/operation-breakdown-chart/${locale}.html`, `<!doctype html><html lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A1 Mobi — actual chart component evidence</title><style>${fonts}${css}</style><body><main class="content pilot-dashboard mobi-c-polish" style="max-width:1000px;margin:auto">${chart}</main></body></html>`);
}
