/* The first 10 seconds of a session, as a video with sound (phones and desktops).

   A session starts with the first key and ends with NEW, an emptied field or leaving the page; each session has ONE clip. The recorder runs hidden,
   in memory only: no disk, no storage, no network, no microphone (the sound is the engine's own output, Clavier.audioTap). It records only while you
   play (it pauses after IDLE ms without a key) until it holds LIMIT ms, then stops by itself; if you are still playing as the limit arrives the
   writing ends with an ellipsis (the rest is in the product). Nothing leaves the device unless the user taps Share. A new session throws the old
   clip away.

   Lifecycle (every path releases the canvas, the tracks, the timers and the chunks):
     startClip()   first key of a session
     touchClip()   every key / input: keeps the clock running
     finishClip()  limit reached, or Share tapped before it: stops the recorder, resolves with the File
     discardClip() field emptied (NEW), page left, or an error                                                                              */
import { root, field } from './dom-v1.js';
import { drawCard, W, H } from './share-card-v1.js';

const LIMIT = 10000, IDLE = 3000;
let clip = null;

const supported = () => window.MediaRecorder && window.Clavier.audioTap && HTMLCanvasElement.prototype.captureStream;   /* every device: phones share it, desktops share or download it */

function pickMime() {
  const c = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=h264,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (let i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported(c[i])) return c[i];
  return '';
}

function release(c) {
  clearInterval(c.tick); cancelAnimationFrame(c.raf);
  try { c.vs.getVideoTracks().forEach((t) => t.stop()); } catch (e) {}   /* the shared audio tap is left alone */
  c.cv.width = c.cv.height = 0; if (c.cv.parentNode) c.cv.parentNode.removeChild(c.cv);
}

export function discardClip() {
  const c = clip; if (!c) return; clip = null;
  try { c.rec.ondataavailable = null; c.rec.onstop = null; c.rec.onerror = null; if (c.rec.state !== 'inactive') c.rec.stop(); } catch (e) {}
  release(c); c.chunks = [];
}

function pause(c) { if (c.rec.state === 'recording') { c.ms += Date.now() - c.at; try { c.rec.pause(); } catch (e) {} } }
function resume(c) { if (c.rec.state === 'paused') { c.at = Date.now(); try { c.rec.resume(); } catch (e) {} } }

/** stops the recorder; resolves with the File (or null) */
export function finishClip(c) {
  if (c.done) return c.done;
  c.done = new Promise((res) => {
    c.rec.onstop = () => {
      cancelAnimationFrame(c.raf);                                           /* c.tick keeps running: a finished clip must still be thrown away when the field is emptied */
      try { c.vs.getVideoTracks().forEach((t) => t.stop()); } catch (e) {}
      c.cv.width = c.cv.height = 0; if (c.cv.parentNode) c.cv.parentNode.removeChild(c.cv);
      const t = c.rec.mimeType || c.mime || 'video/mp4';
      c.file = c.chunks.length ? new File(c.chunks, 'clavier.' + (/mp4/.test(t) ? 'mp4' : 'webm'), { type: t.split(';')[0] }) : null; c.chunks = [];
      res(c.file);
    };
    try { if (c.rec.state === 'paused') c.rec.resume(); c.rec.stop(); } catch (e) { res(null); }
  });
  return c.done;
}

function startClip() {
  const ta = field(); if (!ta || !supported()) return;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  /* Safari / WebKit records a BLACK picture from a canvas that is not in the page, so it is attached: 1px, nearly transparent, behind everything, no events */
  cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;pointer-events:none;z-index:-1';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d'), c = { cv, drawn: 0, chunks: [], ms: 0, at: Date.now(), key: Date.now(), born: Date.now(), mime: pickMime(), file: null, done: null, shown: null, more: false };
  /* repaints on every change AND at ~15 fps while recording (palette colour changes are picked up too, and the encoder always has frames) */
  function paint(force) {
    const v = ta.value + (c.more ? '…' : ''), now = Date.now();
    if (force || v !== c.shown || now - c.drawn > 66) {
      c.shown = v; c.drawn = now; drawCard(ctx, ta, true, c.more);
      const tr = c.vs && c.vs.getVideoTracks()[0]; if (tr && tr.requestFrame) { try { tr.requestFrame(); } catch (e) {} }
    }
  }
  try {
    paint(true);
    c.vs = cv.captureStream(30);
    window.Clavier.audioTap.stream.getAudioTracks().forEach((t) => c.vs.addTrack(t));
    c.rec = new MediaRecorder(c.vs, c.mime ? { mimeType: c.mime, videoBitsPerSecond: 4000000 } : {});
    c.rec.ondataavailable = (e) => { if (e.data && e.data.size) c.chunks.push(e.data); };
    c.rec.start(500);
  } catch (e) { clip = c; discardClip(); return; }
  clip = c;
  (function frame() { if (clip !== c) return; paint(false); c.raf = requestAnimationFrame(frame); })();
  c.tick = setInterval(() => {
    const now = Date.now();
    if (!ta.value && now - c.born > 1500) { discardClip(); return; }         /* the field was emptied (NEW, select-all + delete...): a new session */
    if (c.done) return;
    if (c.rec.state === 'recording') {
      const played = c.ms + (now - c.at);
      if (now - c.key > IDLE) { c.more = false; pause(c); }
      else if (played >= LIMIT) finishClip(c);
      else if (played >= LIMIT - 800) c.more = true;                         /* still playing as the 10 s run out: the last frames end with an ellipsis */
    }
  }, 200);
}

function touchClip() { if (!clip) { startClip(); return; } clip.key = Date.now(); if (!clip.done) resume(clip); }

/** the clip of the current session (or null) */
export const currentClip = () => clip;

export function initClip() {
  window.addEventListener('keydown', (e) => { if (e.key && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && !root.classList.contains('info-open')) touchClip(); }, true);
  document.addEventListener('input', (e) => { if (e.target && e.target.tagName === 'TEXTAREA' && e.target.value) touchClip(); }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && clip && !clip.done) pause(clip); });
  window.addEventListener('pagehide', discardClip);
}
