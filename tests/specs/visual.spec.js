'use strict';
// Pixel regression. The baselines are screenshots of the code the refactor STARTS from; a refactor must not change a single pixel
// (except where the work order marks a "correction"). Re-record with:  node run.js --only=visual --update
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { test, assert } = require('../lib/runner');
const { sleep, click, openTools } = require('../lib/browser');

const DIR = path.join(__dirname, '..', 'visual', 'baselines');
const WIDTHS = [
  { w: 1920, h: 1080, mobile: false }, { w: 1440, h: 900, mobile: false }, { w: 1024, h: 768, mobile: false },
  { w: 430, h: 900, mobile: true }, { w: 390, h: 844, mobile: true }, { w: 360, h: 740, mobile: true }, { w: 320, h: 568, mobile: true },
];
const STATES = {
  home: async () => {},
  dock: async (p) => { await openTools(p); },
  palette: async (p) => { await openTools(p); await click(p, 't-fill'); await sleep(300); },
  info: async (p) => { await openTools(p); await click(p, 't-info'); await sleep(400); },
};

async function shot(page, name) {
  // the caret blinks and the field is focused: hide the caret, move the pointer away, let any fade finish
  await page.addStyleTag({ content: 'textarea{caret-color:transparent!important}' });
  await page.mouse.move(2, 2); await sleep(450);
  return PNG.sync.read(Buffer.from(await page.screenshot({ type: 'png' })));
}

for (const d of WIDTHS) for (const [state, prep] of Object.entries(STATES)) {
  const name = `${state}-${d.w}x${d.h}`;
  test(`visual ${name}`, async ({ open }) => {
    const page = await open({ width: d.w, height: d.h, mobile: d.mobile });
    try {
      await prep(page);
      const img = await shot(page, name), file = path.join(DIR, name + '.png');
      if (process.env.TEST_UPDATE === '1' || !fs.existsSync(file)) { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(file, PNG.sync.write(img)); return; }
      const base = PNG.sync.read(fs.readFileSync(file));
      assert(base.width === img.width && base.height === img.height, `size changed: ${base.width}x${base.height} -> ${img.width}x${img.height}`);
      const diff = new PNG({ width: img.width, height: img.height });
      const n = pixelmatch(base.data, img.data, diff.data, img.width, img.height, { threshold: 0.05 });
      if (n > 0) { fs.mkdirSync(path.join(DIR, '..', 'diffs'), { recursive: true }); fs.writeFileSync(path.join(DIR, '..', 'diffs', name + '.png'), PNG.sync.write(diff)); }
      assert(n === 0, `${n} pixels differ (diff written to tests/visual/diffs/${name}.png)`);
    } finally { await page.close(); }
  }, { tags: ['visual'] });
}
