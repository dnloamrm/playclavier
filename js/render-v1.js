/* The state -> DOM mapping. The ONLY place that writes the classes on <html> and the ARIA / inert attributes that follow the interface state.
   (State changes that also move the focus live in a11y-v1.js, which subscribes after this module.) */
import { root, byId } from './dom-v1.js';

export function render(state) {
  const c = root.classList;
  c.toggle('tools-open', state.tools); c.toggle('palette-open', !!state.palette); c.toggle('info-open', state.info); c.toggle('auto-on', state.auto);
  root.dataset.ui = state.info ? 'info' : state.palette ? 'palette-' + state.palette : state.tools ? 'tools' : 'idle';   /* for debugging and tests */
  byId('t-plus').setAttribute('aria-expanded', String(state.tools));
  byId('t-info').inert = !state.tools;                                       /* out of the tab order and the accessibility tree while it is invisible */
  byId('t-fill').setAttribute('aria-pressed', String(state.palette === 'bg'));
  byId('t-text').setAttribute('aria-pressed', String(state.palette === 'fg'));
  const app = byId('__nuxt');                                                /* the page behind the Info dialog is out of reach (the controls are not inside it) */
  if (app) { if (state.info) app.setAttribute('aria-hidden', 'true'); else app.removeAttribute('aria-hidden'); app.inert = state.info; }
}
