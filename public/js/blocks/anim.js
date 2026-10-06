// Loads an animation engine on demand and wraps it in the shared figure shell.
import { h, reducedMotion } from '../ui.js';
import { createFigure } from '../player.js';

const TAGS = { lanes: 'Queues & lanes', pipeline: 'Pipeline', memory: 'Memory', topology: 'Topology', scrubber: 'Step-through' };
const SAFE = /^[a-z0-9-]+$/;

export async function animBlock(spec) {
  if (!SAFE.test(spec.engine || '')) throw new Error(`Unknown animation engine "${spec.engine}"`);
  const mod = await import(`../anim/engines/${spec.engine}.js`);
  let props = spec.scenario;
  if (!props && spec.scene && SAFE.test(spec.scene)) props = await (await fetch(`/js/anim/scenes/${spec.scene}.json`)).json();
  if (!props?.steps?.length) throw new Error('Animation has no steps');
  const body = h('div', { class: `eng eng-${spec.engine}` });
  const inst = mod.mount(body, { props, reduced: reducedMotion() });
  const fig = createFigure({ label: spec.title || props.title || 'Watch it happen', tag: TAGS[spec.engine] || 'Animation', count: inst.steps, render: inst.go, caption: inst.caption, body, onDestroy: () => inst.destroy(), className: `fig-anim fig-${spec.engine}` });
  return fig;
}
