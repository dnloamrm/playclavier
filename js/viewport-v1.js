/* The controls layer follows the VISIBLE area of the screen (iOS Safari): the layer gets the exact height and offset of the visual viewport, so
   the buttons sit above the keyboard and come back to the bottom when it closes.

   iOS fires the resize event for a closing keyboard late, or not at all. So the live values are read on a short timer while the writing field has
   the focus and for a moment after it loses it (and after touches / returning to the tab), instead of depending on any event. The CSS variables
   are written only when a value really changes. Phones (the phone layout) only. */
import { root, isMobile, onLayout, setVar, clearVar, field } from './dom-v1.js';

const vv = window.visualViewport;
let poll = null, pollUntil = 0, active = false;

function layout() {
  const h = vv ? vv.height : window.innerHeight, t = vv ? vv.offsetTop : 0;
  setVar('--ui-h', h + 'px'); setVar('--ui-top', t + 'px');
  const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  if (kb > 80) {
    /* keyboard up: pin the writing area to the visible viewport, no safe area under the keyboard */
    setVar('--vvh', vv.height + 'px'); setVar('--vvt', vv.offsetTop + 'px'); setVar('--sab', '0px');
  } else {
    /* no keyboard: the static CSS (100dvh, env(safe-area-*)) lays the writing area out */
    clearVar('--vvh'); clearVar('--vvt'); clearVar('--sab');
  }
  if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
}

function watch(ms) {
  pollUntil = Math.max(pollUntil, Date.now() + ms);
  if (poll) return;
  poll = setInterval(() => {
    layout();
    if (Date.now() > pollUntil && !(document.activeElement && document.activeElement.tagName === 'TEXTAREA')) { clearInterval(poll); poll = null; }
  }, 100);
}
function settle() { window.scrollTo(0, 0); if (vv) vv.dispatchEvent(new Event('resize')); layout(); }

const on = {
  resize: () => layout(), scroll: () => layout(), orientationchange: () => watch(1500),
  focus: (e) => { if (e.target && e.target.tagName === 'TEXTAREA') watch(1500); },
  blur: (e) => { if (!e.target || e.target.tagName !== 'TEXTAREA') return; settle(); [60, 160, 320, 600, 1000].forEach((ms) => setTimeout(settle, ms)); watch(2500); },
  touchend: () => watch(800),
  visibility: () => { if (!document.hidden) watch(1500); },
};

function start() {
  if (active) return; active = true;
  if (vv) { vv.addEventListener('resize', on.resize); vv.addEventListener('scroll', on.scroll); }
  window.addEventListener('resize', on.resize); window.addEventListener('scroll', on.scroll, { passive: true }); window.addEventListener('orientationchange', on.orientationchange);
  document.addEventListener('focus', on.focus, true); document.addEventListener('blur', on.blur, true);
  document.addEventListener('touchend', on.touchend, { passive: true, capture: true }); document.addEventListener('visibilitychange', on.visibility);
  layout();
}
function stop() {
  if (!active) return; active = false;
  if (vv) { vv.removeEventListener('resize', on.resize); vv.removeEventListener('scroll', on.scroll); }
  window.removeEventListener('resize', on.resize); window.removeEventListener('scroll', on.scroll); window.removeEventListener('orientationchange', on.orientationchange);
  document.removeEventListener('focus', on.focus, true); document.removeEventListener('blur', on.blur, true);
  document.removeEventListener('touchend', on.touchend, true); document.removeEventListener('visibilitychange', on.visibility);
  clearInterval(poll); poll = null; ['--ui-h', '--ui-top', '--vvh', '--vvt', '--sab'].forEach(clearVar);
}

export function initViewport() { const sync = () => (isMobile() ? start() : stop()); sync(); onLayout(sync); }
