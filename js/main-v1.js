/* Clavier: the entry point. Wires the modules together; nothing else lives here.

   Load order (index.html):
     <head>   css/tokens (render-blocking)  ->  js/colors-v1.js (classic)  ->  the bootstrap script (device, breakpoints, theme: before the first paint)
              ->  js/audio-graph-v1.js (classic: patches the audio graph BEFORE the engine builds it)
     <body>   the app bundle loader (classic)   ->   this module (deferred)

   window.Clavier is the only global: a read-only namespace for debugging and tests, sealed here once everything is wired. */
import { store } from './state-v1.js';
import { render } from './render-v1.js';
import { initAudioUnlock } from './audio-unlock-v1.js';
import { initViewport } from './viewport-v1.js';
import { initAutoType } from './auto-type-v1.js';
import { initControls } from './controls-v1.js';
import { initColorsUi } from './colors-ui-v1.js';
import { initA11y } from './a11y-v1.js';
import { initShare } from './share-v1.js';
import { initAutoscroll } from './autoscroll-v1.js';
import { initVirtualKeyboard } from './virtual-keyboard-v1.js';
import { initStack } from './stack-v1.js';
import { initHasFallback } from './has-fallback-v1.js';

render(store.state);
store.subscribe(render);                          /* first, so the DOM is up to date before any other subscriber moves the focus */

initHasFallback();
initStack();
initColorsUi();
initControls();
initAutoType();
initA11y();
initAutoscroll();
initVirtualKeyboard();
initViewport();
initAudioUnlock();
initShare();

const ns = window.Clavier;
Object.defineProperty(ns, 'state', { get: () => store.state, enumerable: true });
Object.defineProperty(ns, 'version', { value: 'modules-1', enumerable: true });
Object.preventExtensions(ns);
