#!/usr/bin/env node
'use strict';
// Usage: node run.js [--url=https://playclavier.vercel.app] [--only=layout,colors] [--strict] [--update]
//   --url     the deployed (or local) address to test; default: production
//   --only    run only suites / tags (layout, colors, states, info, audio, keyboard-ios, share, a11y, shuffle, visual)
//   --strict  known bugs (XFAIL) also fail the run
//   --update  visual suite: rewrite the baseline screenshots from the page under test instead of comparing
const fs = require('fs');
const path = require('path');
const { launch } = require('./lib/browser');
const { run } = require('./lib/runner');

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const url = (arg('url', process.env.TEST_URL || 'https://playclavier.vercel.app')).replace(/\/$/, '');
const only = arg('only') ? arg('only').split(',') : null;
process.env.TEST_UPDATE = process.argv.includes('--update') ? '1' : '';

for (const f of fs.readdirSync(path.join(__dirname, 'specs')).filter((f) => f.endsWith('.spec.js')).sort()) require(path.join(__dirname, 'specs', f));

(async () => {
  console.log('Testing ' + url + '\n');
  const browser = await launch();
  let ok = false;
  try { ok = await run({ browser, url, only, strict: process.argv.includes('--strict') }); } finally { await browser.close(); }
  process.exit(ok ? 0 : 1);
})();
