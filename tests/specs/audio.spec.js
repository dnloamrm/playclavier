'use strict';
const { test, assert } = require('../lib/runner');
const { sleep, typeInto } = require('../lib/browser');

test('audio: the AudioContext runs after typing and a system interruption is recovered by the next gesture', async ({ open }) => {
  const page = await open({ width: 390, height: 844, mobile: true });
  try {
    await typeInto(page, 'abc');
    assert(await page.evaluate(() => window.Klang.context.state) === 'running', 'context is not running after typing');
    await page.evaluate(() => window.Klang.context.suspend()); await sleep(300);     // share sheet / call / lock screen
    assert(await page.evaluate(() => window.Klang.context.state) === 'suspended', 'could not simulate the interruption');
    await page.keyboard.type('defg', { delay: 150 }); await sleep(700);
    assert(await page.evaluate(() => window.Klang.context.state) === 'running', 'sound did not come back after the interruption');
  } finally { await page.close(); }
}, { tags: ['audio'] });

test('audio: on phones every sound goes through the master chain (low-pass 3800 Hz -> compressor -> -4 dB -> speakers)', async ({ open }) => {
  const page = await open({ width: 390, height: 844, mobile: true, spyConnect: true });
  try {
    await typeInto(page, 'abcdef');
    const log = await page.evaluate(() => window.__conn);
    const toDest = log.filter((c) => c.to === 'AudioDestinationNode');
    assert(toDest.length > 0, 'nothing reaches the speakers');
    const gain = toDest.find((c) => c.from === 'GainNode');
    assert(gain, 'the last node before the speakers is not the master gain: ' + [...new Set(toDest.map((c) => c.from))].join(','));
    assert.near(gain.d.gain, Math.pow(10, -4 / 20), 0.001, 'master gain (-4 dB)');
    const lp = log.find((c) => c.from === 'BiquadFilterNode' && c.d.type === 'lowpass');
    assert(lp && Math.abs(lp.d.freq - 3800) < 1, 'low-pass at 3800 Hz is missing');
    assert(log.some((c) => c.from === 'DynamicsCompressorNode'), 'compressor is missing');
    const direct = toDest.filter((c) => c.from !== 'GainNode');
    assert(direct.length === 0, 'a node bypasses the chain: ' + direct.map((c) => c.from).join(','));
  } finally { await page.close(); }
}, { tags: ['audio'] });

test('audio: on desktop the signal reaches the speakers without the phone chain', async ({ open }) => {
  const page = await open({ spyConnect: true });
  try {
    await typeInto(page, 'abcdef');
    const log = await page.evaluate(() => window.__conn);
    assert(log.some((c) => c.to === 'AudioDestinationNode'), 'nothing reaches the speakers');
    assert(!log.some((c) => c.from === 'BiquadFilterNode' && c.d.type === 'lowpass' && Math.abs(c.d.freq - 3800) < 1), 'the phone low-pass is active on desktop');
  } finally { await page.close(); }
}, { tags: ['audio'] });

test('audio: no page errors while typing, pressing PLAY and AUTO-JAM', async ({ open }) => {
  const page = await open({});
  try {
    await typeInto(page, 'hello');
    await page.evaluate(() => document.getElementById('t-plus').click()); await sleep(300);
    await page.evaluate(() => document.getElementById('t-play').click()); await sleep(1200);
    await page.evaluate(() => document.getElementById('t-auto').click()); await sleep(2500);
    await page.evaluate(() => document.getElementById('t-auto').click()); await sleep(300);
    assert(page.errors.length === 0, 'page errors: ' + page.errors.join(' | '));
  } finally { await page.close(); }
}, { tags: ['audio'] });
