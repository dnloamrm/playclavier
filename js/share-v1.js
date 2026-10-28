/* Share. Phones: the sheet opens at once with the clip of the first 10 s (video + sound) when there is one, otherwise with the card as a PNG.
   Desktop, and anything that is not a phone: the link goes to the clipboard and a short text above the button says so. No native sheet on desktop. */
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

function onShare() {
  /* desktop (and anything that is not a phone): always the link on the clipboard, never a native sheet without the image */
  if (!navigator.share || !(isMobile() && navigator.canShare)) { copyLink(); return; }
  const c = currentClip();
  if (!c) { sharePng(); return; }                                            /* nothing played yet in this session: the static card */
  const ready = c.file ? Promise.resolve(c.file) : Promise.race([finishClip(c), new Promise((r) => setTimeout(() => r(null), 1500))]);
  ready.then((f) => {
    const data = f && { files: [f], title: 'Clavier', text: URL_ };
    if (data && navigator.canShare(data)) send(data); else sharePng();       /* no clip, or this browser cannot share it: the card */
  }).catch(sharePng);
}

export function initShare() { initClip(); byId('t-share').addEventListener('click', onShare); }
