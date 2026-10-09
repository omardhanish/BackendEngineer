// Same contract as plugins.mjs: name + setup(host), host.on(hook, fn)
const available = {
  trim: { name: 'trim', setup: (h) => h.on('text', (s) => s.trim()) },
  upper: { name: 'upper', setup: (h) => h.on('text', (s) => s.toUpperCase()) },
  shout: { name: 'shout', setup: (h) => h.on('text', (s) => `${s}!`) },
};
function build(config) {
  const hooks = {};
  const host = { on: (hook, fn) => (hooks[hook] ??= []).push(fn) };
  for (const n of config.plugins) {                // config sets the order
    const p = available[n];
    if (typeof p?.setup !== 'function') throw new Error(`unknown plugin: ${n}`);
    p.setup(host);
  }
  return (text) => (hooks.text ?? []).reduce((s, fn) => fn(s), text);
}
console.log(build({ plugins: ['trim', 'upper'] })('  hello '));
console.log(build({ plugins: ['trim', 'shout'] })('  hello '));
try { build({ plugins: ['caps'] }); } catch (e) { console.log(e.message); }
