// History-API router. Views are factories returning { destroy?(), keydown?(e) }.
const routes = [];
let current = null;
let token = 0;
let notFound = null;
const listeners = new Set();

export function route(pattern, factory) {
  const keys = [];
  const src = pattern.replace(/\/:([a-z]+)(\?)?/gi, (_, k, opt) => {
    keys.push(k);
    return opt ? '(?:/([^/]+))?' : '/([^/]+)';
  });
  routes.push({ re: new RegExp(`^${src}/?$`), keys, factory });
}
export const fallback = (factory) => { notFound = factory; };
export const onRoute = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const currentView = () => current?.view || null;

export function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  return resolve();
}

export async function resolve() {
  const my = ++token;
  const path = location.pathname;
  let match = null;
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) { match = { r, params: Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1] ? decodeURIComponent(m[i + 1]) : undefined])) }; break; }
  }
  if (current?.view?.destroy) {
    try { current.view.destroy(); } catch (e) { console.error(e); }
  }
  current = null;
  const factory = match ? match.r.factory : notFound;
  const params = match ? match.params : {};
  // Async views get `stale()` so they can stop after an await if the user already navigated elsewhere.
  const view = await factory(params, new URLSearchParams(location.search), { stale: () => my !== token });
  if (my !== token) { view?.destroy?.(); return; }
  current = { view, path, params };
  for (const fn of listeners) fn({ path, params, view });
}

export function start() {
  window.addEventListener('popstate', resolve);
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
    e.preventDefault();
    if (url.pathname + url.search !== location.pathname + location.search) navigate(url.pathname + url.search);
  });
  return resolve();
}
