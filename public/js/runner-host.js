// Page-side handle to the isolated code runner. One hidden iframe, many runs.
// Trust model: only messages whose source is our iframe window AND that carry our nonce are accepted.
import { h } from './ui.js';

let frame = null;
let ready = null;
let nonce = null;
let seq = 0;
const handlers = new Map();

function ensure() {
  if (ready) return ready;
  nonce = crypto.randomUUID();
  frame = h('iframe', { class: 'runner-frame', src: '/sandbox/runner.html', sandbox: 'allow-scripts', title: 'Code runner (isolated)', hidden: true, referrerpolicy: 'no-referrer', tabindex: '-1' });
  ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The code runner did not start.')), 6000);
    window.addEventListener('message', (e) => {
      if (e.source !== frame.contentWindow) return;
      const m = e.data;
      if (!m || typeof m !== 'object') return;
      if (m.t === 'hello') frame.contentWindow.postMessage({ type: 'init', nonce }, '*');
      else if (m.nonce !== nonce) return;
      else if (m.t === 'ready') { clearTimeout(timer); resolve(); }
      else if (m.id) handlers.get(m.id)?.(m);
    });
  });
  document.body.append(frame);
  return ready;
}

/** @returns {Promise<{stop(): void}>} */
export async function runCode(code, { onOut, onEnd }) {
  try { await ensure(); } catch (e) { ready = null; frame?.remove(); onEnd?.({ ok: false, error: { name: 'RunnerError', message: e.message } }); return { stop() {} }; }
  const id = `r${++seq}`;
  handlers.set(id, (m) => {
    if (m.t === 'out') onOut?.(m);
    else if (m.t === 'end') { handlers.delete(id); onEnd?.(m); }
  });
  frame.contentWindow.postMessage({ type: 'run', id, code, nonce }, '*');
  return { stop: () => frame.contentWindow.postMessage({ type: 'stop', nonce }, '*') };
}
