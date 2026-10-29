// The piano and piece drawn on every load; and the assets they point at. Run with  node --test tests/unit
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const picks = require('../../js/picks-v1.js').create();
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('picks: 6 pianos and 6 pieces, unique ids', () => {
  assert.equal(picks.PIANOS.length, 6); assert.equal(picks.SONGS.length, 6);
  assert.equal(new Set(picks.PIANOS.map((p) => p.id)).size, 6); assert.equal(new Set(picks.SONGS.map((s) => s.id)).size, 6);
});

test('picks: never the previous visit\'s piano or piece, whatever the dice say; every one is reachable', () => {
  const seenP = new Set(), seenS = new Set();
  for (const lp of picks.PIANOS) for (const ls of picks.SONGS) for (let i = 0; i < 40; i++) {
    const c = picks.choose({ piano: lp.id, song: ls.id }, () => i / 40);
    assert.notEqual(c.piano.id, lp.id); assert.notEqual(c.song.id, ls.id); seenP.add(c.piano.id); seenS.add(c.song.id);
  }
  assert.equal(seenP.size, 6); assert.equal(seenS.size, 6);
});

test('picks: a missing or corrupt previous visit is ignored', () => {
  for (const last of [null, undefined, 'x', 7, {}, { piano: 'nope', song: 'nope' }]) { const c = picks.choose(last, () => 0.5); assert.ok(c.piano && c.song); }
});

test('picks: every piano has both audio configs and every sample file it names (desktop and phone), every piece has its MIDI file', () => {
  for (const p of picks.PIANOS) for (const cfg of [p.config, p.mobile]) {
    const file = path.join(ROOT, cfg); assert.ok(fs.existsSync(file), cfg);
    const urls = [...fs.readFileSync(file, 'utf8').matchAll(/"url":"(\/audio\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(urls.length > 30, cfg + ' lists its samples');
    for (const u of urls) { const base = path.join(ROOT, u); assert.ok(fs.existsSync(base + '.ogg') && fs.existsSync(base + '.mp3'), u); }
  }
  for (const s of picks.SONGS) assert.ok(fs.existsSync(path.join(ROOT, 'midifiles', s.file)), s.file);
});
