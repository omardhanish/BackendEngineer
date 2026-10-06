// Runs before first paint (classic script in <head>): applies theme, motion and chapter hue so there is no flash.
(function () {
  var d = document.documentElement;
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var theme = get('be:theme') || 'system';
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  d.dataset.theme = dark ? 'dark' : 'light';
  if (get('be:motion') === 'reduce') d.dataset.motion = 'reduce';
  var m = /^\/(?:c|read)\/c(\d\d)/.exec(location.pathname);
  var n = m ? parseInt(m[1], 10) : 1;
  var hue = 25 + 24 * n;
  d.style.setProperty('--h', hue);
  d.dataset.band = hue >= 80 && hue <= 150 ? 'lime' : '';
})();
