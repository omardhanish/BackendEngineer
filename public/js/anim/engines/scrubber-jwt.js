// scrubber · jwt — a REAL HS256 token, computed in the page with WebCrypto (no fake signatures).
// Walk through: parts → decode → sign → tamper → re-sign, then "Try it" with your own payload and secret.
//
// scenario = {
//   kind: 'jwt', secret: 'string', payload: {…},
//   steps: [{caption, view: 'parts'|'decode'|'sign'|'tamper'|'resign', tamper?: {claim: newValue}}]
// }
import { h } from '../../ui.js';

const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uText = (text) => b64u(enc.encode(text));
const fromB64u = (str) => { const t = str.replace(/-/g, '+').replace(/_/g, '/'); return new TextDecoder().decode(Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0))); };

/** Exported for tests: the same bytes jsonwebtoken produces for { algorithm: 'HS256', noTimestamp: true }. */
export async function signHS256(payload, secret) {
  const head = b64uText(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64uText(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64u(await crypto.subtle.sign('HMAC', key, enc.encode(`${head}.${body}`)));
  return { head, body, sig, token: `${head}.${body}.${sig}` };
}

const pretty = (o) => JSON.stringify(o, null, 2);
const short = (t, n = 14) => (t.length > n * 2 + 1 ? `${t.slice(0, n)}…${t.slice(-n)}` : t);

export function mount(host, { props: sc }) {
  const steps = sc.steps;
  const body = h('div', { class: 'jw-body' });
  const lab = h('div', { class: 'jw-playground', hidden: true });
  const toggle = h('button', { class: 'btn btn-quiet btn-xs jw-try', type: 'button' }, 'Try it yourself');
  host.append(h('div', { class: 'jw' }, body, lab, h('div', { class: 'jw-foot' }, toggle)));

  if (!globalThis.crypto?.subtle) { body.append(h('p', { class: 'ly-note' }, 'This demo needs WebCrypto, which browsers only offer on localhost or HTTPS.')); return { steps: steps.length, go() {}, caption: (i) => steps[i].caption, destroy() { host.replaceChildren(); } }; }

  let tryMode = false;
  let current = 0;
  let token = 0;

  const part = (cls, text) => h('span', { class: `jw-part ${cls}` }, text);
  const tokenLine = (t, mark) => h('div', { class: 'jw-token', 'aria-label': 'JSON Web Token' }, part('is-h', t.head), '.', part('is-p', t.body), '.', part('is-s', mark ? t.sig : t.sig));
  const card = (cls, title, content) => h('div', { class: `jw-card ${cls}` }, h('div', { class: 'eng-label' }, title), content);
  const json = (o) => h('pre', { class: 'jw-json' }, pretty(o));
  const verdict = (ok, text) => h('div', { class: `jw-verdict ${ok ? 'is-ok' : 'is-bad'}` }, h('b', null, ok ? 'valid' : 'rejected'), h('span', null, text));

  async function paint(i) {
    const st = steps[i];
    const my = ++token;
    const real = await signHS256(sc.payload, sc.secret);
    const forged = st.tamper ? await signHS256({ ...sc.payload, ...st.tamper }, sc.secret) : null;
    if (my !== token) return;
    const view = st.view || 'parts';
    const kids = [];
    if (view === 'parts') {
      kids.push(tokenLine(real), h('div', { class: 'jw-legend' }, part('is-h', 'header'), part('is-p', 'payload'), part('is-s', 'signature')));
    } else if (view === 'decode') {
      kids.push(tokenLine(real), h('div', { class: 'jw-cards' },
        card('is-h', 'header, decoded', json({ alg: 'HS256', typ: 'JWT' })),
        card('is-p', 'payload, decoded', json(sc.payload)),
        card('is-s', 'signature', h('p', { class: 'jw-hint' }, 'Raw bytes. Nothing to read here.'))),
      h('p', { class: 'jw-hint' }, 'Anyone can decode the first two parts. They are encoded, not encrypted.'));
    } else if (view === 'sign') {
      kids.push(h('div', { class: 'jw-formula' },
        h('code', null, 'signature = HMAC-SHA256(secret, header + "." + payload)'),
        h('div', { class: 'jw-eq' }, h('span', { class: 'jw-chip' }, `secret "${sc.secret}"`), '+', h('span', { class: 'jw-chip is-h' }, short(real.head, 6)), '.', h('span', { class: 'jw-chip is-p' }, short(real.body, 6)), '→', h('span', { class: 'jw-chip is-s' }, short(real.sig, 8)))),
      tokenLine(real));
    } else if (view === 'tamper' && forged) {
      const claim = Object.keys(st.tamper)[0];
      kids.push(h('div', { class: 'jw-cards' },
        card('', 'what the client sends', h('div', null, h('pre', { class: 'jw-json' }, pretty({ ...sc.payload, ...st.tamper })), h('p', { class: 'jw-mono' }, `signature: ${short(real.sig, 8)}`))),
        card('', 'what the server computes', h('div', null, h('p', { class: 'jw-hint' }, `HMAC over the edited payload (${claim}: ${JSON.stringify(st.tamper[claim])})`), h('p', { class: 'jw-mono' }, `signature: ${short(forged.sig, 8)}`)))),
      verdict(false, 'The signatures differ, so the token is rejected.'));
    } else if (view === 'resign' && forged) {
      kids.push(h('div', { class: 'jw-cards' },
        card('', 'someone without the secret', h('p', { class: 'jw-hint' }, 'Can edit the payload but cannot produce a matching signature.')),
        card('', 'the server, with the secret', h('p', { class: 'jw-mono' }, `signs it: ${short(forged.sig, 8)}`))),
      verdict(true, 'Only the secret holder can issue a token the server accepts.'));
    }
    body.replaceChildren(...kids);
  }

  // "Try it": edit the payload and both secrets; the token is recomputed on every keystroke
  const payloadBox = h('textarea', { class: 'jw-ta', rows: 5, spellcheck: 'false', 'aria-label': 'Payload JSON' });
  const signSecret = h('input', { class: 'jw-in', type: 'text', spellcheck: 'false', 'aria-label': 'Signing secret' });
  const checkSecret = h('input', { class: 'jw-in', type: 'text', spellcheck: 'false', 'aria-label': 'Verifying secret' });
  const out = h('div', { class: 'jw-out' });
  lab.append(
    h('div', { class: 'jw-form' },
      h('label', null, h('span', null, 'Payload (JSON)'), payloadBox),
      h('label', null, h('span', null, 'Server signs with'), signSecret),
      h('label', null, h('span', null, 'Server verifies with'), checkSecret)),
    out);
  let labToken = 0;
  async function recompute() {
    const my = ++labToken;
    let payload;
    try { payload = JSON.parse(payloadBox.value); } catch { out.replaceChildren(h('p', { class: 'jw-hint is-bad' }, 'The payload is not valid JSON yet.')); return; }
    const signed = await signHS256(payload, signSecret.value);
    const expected = await signHS256(payload, checkSecret.value);
    if (my !== labToken) return;
    const ok = signed.sig === expected.sig;
    out.replaceChildren(tokenLine(signed), verdict(ok, ok ? 'The verifying secret reproduces the signature.' : 'A different secret gives a different signature.'), h('p', { class: 'jw-hint' }, `decoded payload: ${fromB64u(signed.body)}`));
  }
  for (const el of [payloadBox, signSecret, checkSecret]) el.addEventListener('input', recompute);
  toggle.addEventListener('click', () => {
    tryMode = !tryMode;
    lab.hidden = !tryMode;
    body.hidden = tryMode;
    toggle.textContent = tryMode ? 'Back to the steps' : 'Try it yourself';
    if (tryMode) { payloadBox.value = pretty(sc.payload); signSecret.value = sc.secret; checkSecret.value = sc.secret; recompute(); } else paint(current);
  });

  return {
    steps: steps.length,
    go(i) { current = i; if (tryMode) { tryMode = false; lab.hidden = true; body.hidden = false; toggle.textContent = 'Try it yourself'; } paint(i); },
    caption: (i) => steps[i].caption,
    destroy() { token++; labToken++; host.replaceChildren(); },
  };
}
