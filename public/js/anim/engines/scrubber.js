// "Scrubber" engine: a small, exact model of something that changes over time, which you step through.
// One entry point, four kinds (props.kind). Each kind is a pure function of the step index.
//   layers  Docker layer cache: which Dockerfile lines rebuild after a change     (scrubber-layers.js)
//   scan    full table scan vs index lookup, with counters                       (scrubber-scan.js)
//   git     commit graph driven by real git operations (commit, branch, merge…) (scrubber-git.js)
//   jwt     a real HS256 token: decode, sign, tamper, verify (WebCrypto)         (scrubber-jwt.js)
import * as layers from './scrubber-layers.js';
import * as scan from './scrubber-scan.js';
import * as git from './scrubber-git.js';
import * as jwt from './scrubber-jwt.js';

const KINDS = { layers, scan, git, jwt };

export function mount(host, ctx) {
  const kind = KINDS[ctx.props?.kind];
  if (!kind) throw new Error(`Unknown scrubber kind "${ctx.props?.kind}" (use ${Object.keys(KINDS).join(', ')})`);
  return kind.mount(host, ctx);
}
