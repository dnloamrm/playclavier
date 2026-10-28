'use strict';
// A tiny test runner: no framework, one browser shared by every spec, readable output, exit code 1 on any unexpected result.
//
//   test('name', async ({ browser, url, open }) => { ... }, { tags: ['layout'], knownFailing: 'why it fails today' })
//
// A test marked knownFailing is EXPECTED to fail (it documents a bug that is still open). It prints XFAIL. If it unexpectedly
// passes it prints XPASS and the run fails, so the marker is removed the moment the bug is fixed.
const registry = [];
const test = (name, fn, meta = {}) => registry.push({ name, fn, meta });

async function run({ browser, url, only, strict }) {
  const { open } = require('./browser');
  const rows = [];
  for (const t of registry) {
    if (only && !(t.meta.tags || []).concat(t.meta.suite || []).some((g) => only.includes(g))) continue;
    const started = Date.now();
    let status = 'PASS', detail = '';
    try { await t.fn({ browser, url, open: (o) => open(browser, url, o) }); } catch (e) { status = 'FAIL'; detail = (e && e.message || String(e)).split('\n')[0]; }
    if (t.meta.knownFailing) status = status === 'FAIL' ? 'XFAIL' : 'XPASS';
    rows.push({ name: t.name, status, detail, ms: Date.now() - started, why: t.meta.knownFailing });
    const tag = { PASS: 'PASS ', FAIL: 'FAIL ', XFAIL: 'XFAIL', XPASS: 'XPASS' }[status];
    console.log(`${tag}  ${t.name}${detail ? '  —  ' + detail : ''}${status === 'XFAIL' ? '  [known bug: ' + t.meta.knownFailing + ']' : ''}`);
  }
  const count = (s) => rows.filter((r) => r.status === s).length;
  console.log(`\n${count('PASS')} passed, ${count('FAIL')} failed, ${count('XFAIL')} known bugs still failing, ${count('XPASS')} known bugs now passing (remove the marker)`);
  const bad = count('FAIL') + count('XPASS') + (strict ? count('XFAIL') : 0);
  return bad === 0;
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
assert.near = (a, b, tol, msg) => assert(near(a, b, tol), `${msg || 'value'}: expected ${b} (±${tol}), got ${Math.round(a * 100) / 100}`);
assert.eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), `${msg || 'value'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

module.exports = { test, run, assert };
