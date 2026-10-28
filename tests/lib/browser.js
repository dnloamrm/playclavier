'use strict';
// Shared browser helpers. Every spec opens pages through open() so that devices, spies and fakes are set up in one place.
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
}

/**
 * Opens the app and waits until it is interactive.
 * opts: { width, height, mobile, fakeViewport, shareSpy: 'none' | 'files' | 'url', colors: {bg,fg}, scale }
 *  - mobile:       iPhone user agent + touch (the phone code path)
 *  - fakeViewport: a window.visualViewport that never fires an event on its own (how iOS Safari behaves)
 *  - shareSpy:     'files' = navigator.share/canShare record what they receive and accept files; 'url' = share exists but refuses files;
 *                  'none'  = no Web Share API at all
 */
async function open(browser, url, opts = {}) {
  const { width = 1440, height = 900, mobile = false, fakeViewport = false, shareSpy = 'none', colors = null, scale = 1, spyConnect = false } = opts;
  // every page gets its own browser context (own localStorage, cookies, permissions): no test can leak state into another
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const closePage = page.close.bind(page);
  page.close = async () => { try { await closePage(); } finally { await context.close().catch(() => {}); } };
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  if (mobile) await page.setUserAgent(IOS_UA);
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: scale });
  await page.evaluateOnNewDocument((o) => {
    window.__copied = null;
    try { navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; } catch (e) {}
    if (o.shareSpy === 'files' || o.shareSpy === 'url') {
      navigator.canShare = (d) => (o.shareSpy === 'files' ? true : !(d && d.files));
      navigator.share = (d) => { window.__shared = d; window.__sharedAt = performance.now(); return Promise.resolve(); };
    } else {
      try { delete Navigator.prototype.canShare; delete Navigator.prototype.share; } catch (e) {}
    }
    if (o.fakeViewport) {
      const f = new EventTarget();
      let h = null;   // until a test sets it, the height is whatever the window really is
      Object.defineProperty(f, 'height', { get: () => (h == null ? innerHeight : h), set: (v) => { h = v; }, enumerable: true });
      Object.assign(f, { width: innerWidth, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { value: f, configurable: true });
      window.__vv = f;
    }
    if (o.colors) localStorage.setItem('clavier-colors', JSON.stringify(o.colors));
    if (o.spyConnect) {   // records every connection made in the audio graph (installed before the app's own connect() patch, which wraps it)
      window.__conn = [];
      const base = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (dest) {
        try {
          const n = this.constructor.name, d = {};
          if (n === 'BiquadFilterNode') { d.type = this.type; d.freq = this.frequency.value; }
          if (n === 'GainNode') d.gain = this.gain.value;
          if (n === 'DynamicsCompressorNode') d.ratio = this.ratio.value;
          window.__conn.push({ from: n, d, to: dest && dest.constructor && dest.constructor.name });
        } catch (e) {}
        return base.apply(this, arguments);
      };
    }
  }, { shareSpy, fakeViewport, colors, spyConnect });
  await page.goto(url + (url.includes('?') ? '&' : '/?') + 'cb=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.$nuxt && window.$nuxt.$store.state.isLoading === false, { timeout: 200000 });
  await sleep(1200);
  await page.addStyleTag({ content: 'vercel-live-feedback{display:none!important}' });   // the Vercel preview toolbar (preview deployments only) must not enter screenshots or hit tests
  return page;
}

// small page helpers --------------------------------------------------------------------------------------------
const click = (page, id) => page.evaluate((i) => document.getElementById(i).click(), id);           // programmatic click (no pointer, no focus)
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }, sel);
const classes = (page) => page.evaluate(() => ({
  tools: document.documentElement.classList.contains('tools-open'),
  info: document.documentElement.classList.contains('info-open'),
  palette: document.documentElement.classList.contains('palette-open'),
  auto: document.documentElement.classList.contains('auto-on'),
}));
const openTools = async (page) => { if (!(await classes(page)).tools) { await click(page, 't-plus'); await sleep(350); } };
const text = (page) => page.evaluate(() => document.querySelector('textarea').value);
const typeInto = async (page, s, delay = 70) => { await page.click('textarea'); await page.keyboard.type(s, { delay }); await sleep(300); };

module.exports = { launch, open, sleep, click, rect, classes, openTools, text, typeInto, IOS_UA };
