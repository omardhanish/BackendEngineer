// Runs learner code in a throwaway Worker, inside an opaque-origin sandboxed iframe (see server CSP).
// The page can talk only to its parent via postMessage; the worker has no DOM, no storage, no network.
(function () {
  'use strict';
  var MAX_LINES = 200;
  var MAX_BYTES = 64 * 1024;
  var TIMEOUT_MS = 4000;
  var nonce = null;
  var current = null;

  function post(msg) { msg.nonce = nonce; parent.postMessage(msg, '*'); }

  function cleanup() {
    if (!current) return;
    clearTimeout(current.timer);
    try { current.worker.terminate(); } catch (e) { /* already gone */ }
    URL.revokeObjectURL(current.url);
    current = null;
  }

  function finish(run, payload) {
    if (current !== run) return;
    cleanup();
    payload.id = run.id;
    payload.t = 'end';
    post(payload);
  }

  function start(id, code) {
    cleanup();
    var prefix = self.__SHIMS_SRC + '\n';
    var offset = prefix.split('\n').length - 1;
    var src = prefix + '(async()=>{' + self.__esmToCjs(code) + '\n})().then(__done,__fail);';
    var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    var worker;
    try { worker = new Worker(url); } catch (e) {
      URL.revokeObjectURL(url);
      post({ id: id, t: 'end', ok: false, error: { name: 'RunnerError', message: 'The browser would not start the code runner: ' + e.message } });
      return;
    }
    var run = { id: id, worker: worker, url: url, lines: 0, bytes: 0 };
    run.timer = setTimeout(function () {
      finish(run, { ok: false, timedOut: true, error: { name: 'Timeout', message: 'Stopped after ' + TIMEOUT_MS / 1000 + ' seconds. The code was still running: an infinite loop, or a timer that never stops.' } });
    }, TIMEOUT_MS);
    current = run;

    worker.onmessage = function (e) {
      var m = e.data;
      if (!m || current !== run) return;
      if (m.t === 'out') {
        var text = String(m.text).slice(0, MAX_BYTES);
        run.lines += text.split('\n').length;
        run.bytes += text.length;
        if (run.lines > MAX_LINES || run.bytes > MAX_BYTES) {
          // a program that floods the output is stopped, not just ignored: terminating the worker also frees the page
          post({ id: id, t: 'out', level: 'warn', text: '… output cut off (too long) …' });
          finish(run, { ok: false, error: { name: 'OutputLimit', message: 'Stopped: the program printed too much output.' } });
          return;
        }
        post({ id: id, t: 'out', level: m.level, text: text, raw: !!m.raw });
      } else if (m.t === 'end') {
        var err = m.error;
        if (err && typeof err.line === 'number') { err.line = Math.max(1, err.line - offset); }
        finish(run, { ok: !!m.ok, code: m.code, error: err });
      }
    };
    worker.onerror = function (e) {
      e.preventDefault();
      var msg = String(e.message || 'Error').replace(/^Uncaught\s+/, '');
      var name = (/^(\w*Error)\b/.exec(msg) || [])[1] || 'Error';
      finish(run, { ok: false, error: { name: name, message: msg.replace(/^\w*Error:\s*/, ''), line: e.lineno ? Math.max(1, e.lineno - offset) : null } });
    };
  }

  window.addEventListener('message', function (e) {
    if (e.source !== parent) return;
    var m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'init' && nonce === null) { nonce = String(m.nonce); post({ t: 'ready' }); }
    else if (nonce === null || m.nonce !== nonce) return;
    else if (m.type === 'run') start(String(m.id), String(m.code).slice(0, 20000));
    else if (m.type === 'stop' && current) finish(current, { ok: false, stopped: true, error: { name: 'Stopped', message: 'Stopped.' } });
  });

  parent.postMessage({ t: 'hello' }, '*');
})();
