// Dev-only: renders every sample hero in the real figure shell, so engines can be checked (and screenshotted) in isolation.
import { heroBlock } from '/js/frames.js';
import { SAMPLES } from '/_dev/samples.js';

const q = new URLSearchParams(location.search);
if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme');
if (q.get('h')) document.documentElement.style.setProperty('--h', q.get('h'));
if (q.get('w')) document.getElementById('gal').style.setProperty('--gal-w', `${q.get('w')}px`);
const only = q.get('only');
const host = document.getElementById('gal');
for (const [name, hero] of Object.entries(SAMPLES)) {
  if (only && !name.startsWith(only)) continue;
  const item = document.createElement('section');
  item.className = 'gal-item';
  item.dataset.name = name;
  item.innerHTML = '<h2></h2>';
  item.querySelector('h2').textContent = name;
  host.append(item);
  try {
    const fig = await heroBlock(hero);
    item.append(fig.el);
    const step = Number(q.get('step'));
    if (step) fig.stepper?.go(step);
  } catch (e) {
    item.append(Object.assign(document.createElement('pre'), { textContent: `FAILED: ${e.message}` }));
  }
}
document.body.dataset.ready = '1';
