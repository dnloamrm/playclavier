/* Small DOM + device helpers shared by the modules. */
export const root = document.documentElement;
export const byId = (id) => document.getElementById(id);
export const field = () => document.querySelector('textarea');

/* The ONE definition of "phone layout": a phone, or a window as narrow as the phone breakpoint (--bp-narrow). The bootstrap script keeps the
   is-mobile class up to date (also when the window is resized) and fires "clavier:layout" whenever it changes. */
export const isMobile = () => root.classList.contains('is-mobile');
export const onLayout = (fn) => { window.addEventListener('clavier:layout', fn); return () => window.removeEventListener('clavier:layout', fn); };

/* Sets / removes a CSS variable on <html> only when the value really changes (no style recalculation for nothing). */
const cache = new Map();
export function setVar(name, value) { if (cache.get(name) !== value) { cache.set(name, value); root.style.setProperty(name, value); } }
export function clearVar(name) { if (cache.has(name)) { cache.delete(name); root.style.removeProperty(name); } }
