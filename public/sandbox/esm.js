// ES-module `import` → `require()` for the in-browser runner (browser workers cannot import Node built-ins).
// Every quantifier is bounded: the first version used `\s+([\s\S]*?)\s+from`, which is cubic on whitespace, and a pasted
// `import` followed by thousands of spaces stalled the runner thread before its 4 s watchdog even existed (security review).
// Newlines inside a rewritten statement are preserved so error line numbers still match the editor.
(function (g) {
  'use strict';
  var tmp = 0;
  var IMPORT_FROM = /^[ \t]{0,40}import\s{1,20}([^'"`;]{1,400}?)\s{1,20}from\s{1,20}(['"])([^'"\n]{1,200})\2[ \t]{0,40};?/gm;
  var IMPORT_ONLY = /^[ \t]{0,40}import\s{1,20}(['"])([^'"\n]{1,200})\1[ \t]{0,40};?/gm;
  var NS = /^\*\s{0,20}as\s{1,20}([\w$]{1,80})$/;
  var MIXED = /^([\w$]{1,80})\s{0,20},\s{0,20}(\{[^}]{0,400}\})$/;
  var asToColon = function (s) { return s.replace(/\bas\b/g, ':').replace(/\s+/g, ' '); };

  g.__esmToCjs = function (code) {
    return String(code)
      .replace(IMPORT_FROM, function (all, clause, q, mod) {
        var pad = '\n'.repeat((all.match(/\n/g) || []).length);
        var m = JSON.stringify(mod);
        clause = clause.trim();
        var out;
        var ns = NS.exec(clause);
        if (ns) out = 'const ' + ns[1] + ' = require(' + m + ');';
        else if (clause[0] === '{') out = 'const ' + asToColon(clause) + ' = require(' + m + ');';
        else {
          var mix = MIXED.exec(clause);
          if (mix) {
            var t = '__m' + ++tmp;
            out = 'const ' + t + ' = require(' + m + '); const ' + mix[1] + ' = ' + t + '.default ?? ' + t + '; const ' + asToColon(mix[2]) + ' = ' + t + ';';
          } else out = 'const ' + clause + ' = require(' + m + ');';
        }
        return out + pad;
      })
      .replace(IMPORT_ONLY, function (all, q, mod) { return 'require(' + JSON.stringify(mod) + ');'; });
  };
})(self);
