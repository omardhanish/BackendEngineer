// Runs before first paint (classic script in <head>): applies theme, motion and chapter hue so there is no flash.
(function () {
  var d = document.documentElement;
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var theme = get('be:theme') || 'system';
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  d.dataset.theme = dark ? 'dark' : 'light';
  if (get('be:motion') === 'reduce') d.dataset.motion = 'reduce';
  // /b/<book>[/c/cNN | /read/cNN-…]: the hue the page will use, remembered from the last visit (see rememberHue in state.js)
  var path = location.pathname;
  var hue = 250;
  var b = /^\/b\/([a-z0-9][a-z0-9-]*)(?:\/(?:c|read)\/(c\d\d))?/.exec(path);
  if (b) {
    var h = get('be:hue:' + b[1] + (b[2] ? ':' + b[2] : '')) || get('be:hue:' + b[1]);
    if (h !== null && isFinite(+h)) hue = +h;
  } else {
    // the original single-book URLs (/c/c03, /read/c03-…) belong to the first book, whose chapters ran on 25 + 24 * n
    var m = /^\/(?:c|read)\/c(\d\d)/.exec(path);
    if (m) hue = 25 + 24 * parseInt(m[1], 10);
  }
  d.style.setProperty('--h', hue);
  d.dataset.band = hue >= 80 && hue <= 150 ? 'lime' : '';
})();
