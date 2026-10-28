/* The interface state machine. ONE state object, a pure reducer, and a store that tells the subscribers what changed.
   Everything the user can see (classes on <html>, ARIA, inert, focus) is derived from the state in render-v1.js; nothing else keeps its own flags.

   state = { tools: boolean, palette: null | 'bg' | 'fg', info: boolean, auto: boolean }
     tools    the dock and the "i" button are open
     palette  the colour strip is open, for the background ('bg') or for the text ('fg'); only exists while tools is true
     info     the Info page is open
     auto     Auto-jam is typing

   events (all plain objects: { type, ...payload })
     tools/open | tools/close | tools/toggle      close also closes the palette
     palette/toggle {mode}                        needs the tools open; the same mode again closes it
     palette/close
     info/open | info/close {via}                 via: 'escape' | 'new' | 'home' | undefined (decides where the focus goes)
     home                                         the "X": closes the palette, the tools and the Info page
     escape                                       Info open -> closes only the Info; otherwise closes the tools
     auto/start | auto/stop */
export const initial = Object.freeze({ tools: false, palette: null, info: false, auto: false });

export function reduce(s, e) {
  switch (e.type) {
    case 'tools/open': return s.tools ? s : { ...s, tools: true };
    case 'tools/close': return s.tools || s.palette ? { ...s, tools: false, palette: null } : s;
    case 'tools/toggle': return s.tools ? reduce(s, { type: 'tools/close' }) : { ...s, tools: true };
    case 'palette/toggle': return !s.tools ? s : { ...s, palette: s.palette === e.mode ? null : e.mode };
    case 'palette/close': return s.palette ? { ...s, palette: null } : s;
    case 'info/open': return s.info ? s : { ...s, info: true };
    case 'info/close': return s.info ? { ...s, info: false } : s;
    case 'home': return s.tools || s.palette || s.info ? { ...s, tools: false, palette: null, info: false } : s;
    case 'escape': return s.info ? { ...s, info: false } : reduce(s, { type: 'tools/close' });
    case 'auto/start': return s.auto ? s : { ...s, auto: true };
    case 'auto/stop': return s.auto ? { ...s, auto: false } : s;
    default: return s;
  }
}

export function createStore(start = initial) {
  let state = Object.freeze({ ...start });
  const subscribers = new Set();
  return {
    get state() { return state; },
    dispatch(event) {
      const next = reduce(state, event);
      if (next === state) return state;
      const prev = state; state = Object.freeze(next);
      subscribers.forEach((fn) => fn(state, prev, event));
      return state;
    },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  };
}

export const store = createStore();
export const dispatch = (e) => store.dispatch(e);
