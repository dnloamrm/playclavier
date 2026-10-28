/* Share.
   Phones: the native sheet opens at once with the clip of the first 10 s (video + sound) when there is one, otherwise with the card as a PNG.
   Desktop: with a clip, the native sheet where the browser has one for files (Safari / Chrome on macOS, Chrome / Edge on Windows: AirDrop, Messages,
   Mail...), otherwise the video is downloaded ("Video saved", and the link goes to the clipboard). Nothing played yet: the link goes to the clipboard. */
import { byId, isMobile, field } from './dom-v1.js';
import { cardPng } from './share-card-v1.js';
import { currentClip, finishClip, initClip } from './share-clip-v1.js';
import { unlockAudio } from './audio-unlock-v1.js';

const URL_ = 'https://playclavier.vercel.app';
let toastTimer = 0;

function toast(msg) {
  if (isMobile()) return;                                                    /* phones: no text, the share sheet is the feedback */
  const el = byId('toast'), u = byId('ui').getBoundingClientRect(), r = byId('t-share').getBoundingClientRect();
  el.style.left = (r.left + r.width / 2 - u.left) + 'px'; el.style.bottom = (u.bottom - r.top + 40) + 'px';
  el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}

function copyLink() {
  const ok = () => toast('Link copied');
  const old = () => {
    const i = document.createElement('textarea'); i.value = URL_; i.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(i); i.select();
    try { document.execCommand('copy'); ok(); } catch (e) {} i.remove();
    const ta = field(); if (ta) ta.focus({ preventScroll: true });
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(URL_).then(ok, old); else old();
}

const send = (data) => navigator.share(data)
  .catch((e) => { if (!e || e.name !== 'AbortError') copyLink(); })
  .then(unlockAudio);                                                        /* the sheet can interrupt the audio session: bring it back */

function sharePng() {
  let data = { title: 'Clavier', text: 'Clavier: jam your solo', url: URL_ };
  try { const f = cardPng(), withFile = { files: [f], title: 'Clavier', text: URL_ }; if (navigator.canShare(withFile)) data = withFile; } catch (e) {}
  return send(data);
}

function download(file) {
  const u = URL.createObjectURL(file), a = document.createElement('a');
  a.href = u; a.download = file.name; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
  const ta = field(); if (ta) ta.focus({ preventScroll: true });
}

/* desktop: the clip goes to the native sheet when the browser can share that file, otherwise it is downloaded */
function shareClipOnDesktop(file) {
  const data = { files: [file], title: 'Clavier', text: URL_ };
  if (navigator.share && navigator.canShare && navigator.canShare(data)) { send(data); return; }
  download(file);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(URL_).catch(() => {});
  toast('Video saved');
}

function onShare() {
  const phone = isMobile() && navigator.share && navigator.canShare;
  const c = currentClip();
  if (!c) { if (phone) sharePng(); else copyLink(); return; }                /* nothing played yet in this session: the card on phones, the link on desktop */
  const ready = c.file ? Promise.resolve(c.file) : Promise.race([finishClip(c), new Promise((r) => setTimeout(() => r(null), 1500))]);
  ready.then((f) => {
    if (!f) { if (phone) sharePng(); else copyLink(); return; }
    if (!phone) { shareClipOnDesktop(f); return; }
    const data = { files: [f], title: 'Clavier', text: URL_ };
    if (navigator.canShare(data)) send(data); else sharePng();               /* this browser cannot share the clip: the card */
  }).catch(() => (phone ? sharePng() : copyLink()));
}

export function initShare() { initClip(); byId('t-share').addEventListener('click', onShare); }
