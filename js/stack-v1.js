/* The text field and the Info page reserve exactly the space the controls take. #stack is MEASURED, never estimated:
     --stack-h    height of what is on screen now (the corner buttons; + the dock when the tools are open; + the palette when it is open)
     --stack-max  height with the dock open (the Info page uses it, so its text never moves when the tools open or close)
   Both are measured from the bottom of the controls layer, so they follow the visible area (keyboard up or down) by themselves. */
import { root, byId, setVar } from './dom-v1.js';
import { store } from './state-v1.js';

export function initStack() {
  const ui = byId('ui'), stack = byId('stack'), plus = byId('t-plus'), dock = byId('dock'), pal = byId('palette');
  if (!ui || !stack) return;
  function measure() {
    const bottom = ui.getBoundingClientRect().bottom, s = store.state;
    const tPlus = plus.getBoundingClientRect().top, tDock = dock.getBoundingClientRect().top, tPal = pal.getBoundingClientRect().top;
    const max = bottom - Math.min(tPlus, tDock);
    let h = bottom - tPlus;
    if (s.tools) { h = max; if (s.palette) h = Math.max(h, bottom - tPal); }
    setVar('--stack-max', Math.round(max * 100) / 100 + 'px'); setVar('--stack-h', Math.round(h * 100) / 100 + 'px');
  }
  if (window.ResizeObserver) { const ro = new ResizeObserver(measure); [stack, dock, pal, plus].forEach((e) => ro.observe(e)); }
  store.subscribe(measure);
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
}
