// Dev-only sample heroes for the engine gallery. They double as worked examples of each scenario format.
const anim = (engine, scenario, title) => ({ type: 'anim', engine, title, scenario });

export const SAMPLES = {
  'topology-lb': anim('topology', {
    tiers: [['c1', 'c2'], ['lb'], ['s1', 's2', 's3']],
    nodes: {
      c1: { label: 'Client A', kind: 'user' }, c2: { label: 'Client B', kind: 'user' },
      lb: { label: 'Load balancer', kind: 'lb', sub: 'round robin' },
      s1: { label: 'Server 1', kind: 'server' }, s2: { label: 'Server 2', kind: 'server' }, s3: { label: 'Server 3', kind: 'server' },
    },
    links: [['c1', 'lb'], ['c2', 'lb'], ['lb', 's1'], ['lb', 's2'], ['lb', 's3']],
    steps: [
      { caption: 'Two clients send requests to one address: the load balancer.', send: [{ from: 'c1', to: 'lb', label: 'GET /' }, { from: 'c2', to: 'lb', label: 'GET /' }] },
      { caption: 'It forwards the first request to server 1.', send: [{ from: 'lb', to: 's1', label: 'GET /' }], badge: { s1: '1 req' } },
      { caption: 'The next request goes to server 2, then server 3. Load spreads evenly.', send: [{ from: 'lb', to: 's2', label: 'GET /' }, { from: 'lb', to: 's3', label: 'GET /' }], badge: { s1: '1 req', s2: '1 req', s3: '1 req' } },
      { caption: 'Server 2 crashes. Its health check fails.', state: { s2: 'down' }, badge: { s2: 'down' }, focus: ['s2'] },
      { caption: 'The balancer skips it. Clients never notice.', send: [{ from: 'c1', to: 'lb', label: 'GET /' }, { from: 'lb', to: 's3', label: 'GET /' }], badge: { s1: '1 req', s2: 'down', s3: '2 req' } },
    ],
  }, 'Spreading load'),

  'topology-replication': anim('topology', {
    tiers: [['app'], ['primary'], ['r1', 'r2']],
    nodes: {
      app: { label: 'App server', kind: 'server' },
      primary: { label: 'Primary', kind: 'db', sub: 'accepts writes' },
      r1: { label: 'Replica 1', kind: 'db', sub: 'read only' }, r2: { label: 'Replica 2', kind: 'db', sub: 'read only' },
    },
    links: [['app', 'primary', { label: 'writes' }], ['primary', 'r1', { dashed: true }], ['primary', 'r2', { dashed: true }], ['app', 'r1', { label: 'reads', dashed: true }]],
    groups: [{ label: 'Database cluster', nodes: ['primary', 'r1', 'r2'] }],
    steps: [
      { caption: 'All data starts identical on every database.', badge: { primary: 'v1', r1: 'v1', r2: 'v1' } },
      { caption: 'A write goes to the primary only.', send: [{ from: 'app', to: 'primary', label: 'UPDATE', tone: 'warn' }], badge: { primary: 'v2' }, state: { primary: 'new' } },
      { caption: 'The primary ships the change to each replica. This takes a moment.', send: [{ from: 'primary', to: 'r1', label: 'v2', tone: 'info' }], badge: { primary: 'v2', r1: 'v2', r2: 'v1' }, state: { primary: 'up', r2: 'stale' } },
      { caption: 'A read hitting replica 2 right now returns old data: replication lag.', send: [{ from: 'app', to: 'r1', label: 'SELECT' }], focus: ['r2'] },
    ],
  }, 'Primary and replicas'),

  'topology-queue': anim('topology', {
    tiers: [['api'], ['q'], ['w1', 'w2']],
    nodes: {
      api: { label: 'API', kind: 'service' }, q: { label: 'Job queue', kind: 'queue' },
      w1: { label: 'Worker 1', kind: 'server' }, w2: { label: 'Worker 2', kind: 'server' },
    },
    links: [['api', 'q'], ['q', 'w1'], ['q', 'w2']],
    steps: [
      { caption: 'The API answers fast and drops jobs on the queue.', send: [{ from: 'api', to: 'q', label: 'job 1' }], items: { q: ['j1'] } },
      { caption: 'More jobs arrive than workers can handle at once. They wait.', send: [{ from: 'api', to: 'q', label: 'job 4' }], items: { q: ['j1', 'j2', 'j3', 'j4'] } },
      { caption: 'Each job goes to exactly one worker.', send: [{ from: 'q', to: 'w1', label: 'j1' }, { from: 'q', to: 'w2', label: 'j2' }], items: { q: ['j3', 'j4'] }, state: { w1: 'busy', w2: 'busy' } },
    ],
  }, 'A queue between services'),

  'topology-ecs': anim('topology', {
    tiers: [['dev'], ['ecr'], ['svc'], ['t1', 't2']],
    nodes: {
      dev: { label: 'You', kind: 'user' }, ecr: { label: 'ECR', kind: 'box', sub: 'image registry' },
      svc: { label: 'ECS service', kind: 'service', sub: 'keeps 2 tasks' },
      t1: { label: 'Task 1', kind: 'box' }, t2: { label: 'Task 2', kind: 'box' },
    },
    links: [['dev', 'ecr', { label: 'push' }], ['ecr', 'svc', { label: 'pull', dashed: true }], ['svc', 't1'], ['svc', 't2']],
    groups: [{ label: 'ECS cluster', nodes: ['svc', 't1', 't2'] }],
    steps: [
      { caption: 'You push a Docker image to the registry.', send: [{ from: 'dev', to: 'ecr', label: 'image:v1' }] },
      { caption: 'The service starts tasks from the image.', send: [{ from: 'ecr', to: 'svc', label: 'image:v1' }], state: { t1: 'new', t2: 'new' } },
      { caption: 'If a task dies, the service starts a new one.', state: { t1: 'down', t2: 'ok' }, badge: { t1: 'stopped' } },
    ],
  }, 'Registry to cluster'),

  'topology-ring-ring': anim('topology', {
    layout: 'ring', size: 100,
    servers: { A: { at: 15 }, B: { at: 45 }, C: { at: 80 }, D: { at: 60 } },
    keys: [5, 12, 20, 33, 41, 50, 58, 67, 72, 85, 93, 98].map((at, i) => ({ id: `k${i + 1}`, at })),
    steps: [
      { caption: 'Servers and keys hash onto the same ring. A key belongs to the first server clockwise.', servers: ['A', 'B', 'C'], focus: ['k5'] },
      { caption: 'Add server D. Only the keys between B and D move. The rest stay put.', servers: ['A', 'B', 'C', 'D'] },
      { caption: 'Remove B. Its keys slide to the next server clockwise.', servers: ['A', 'C', 'D'] },
    ],
  }, 'Consistent hashing'),

  'topology-ring-mod': anim('topology', {
    layout: 'ring', size: 100, rule: 'mod',
    servers: { A: { at: 10 }, B: { at: 40 }, C: { at: 70 }, D: { at: 90 } },
    keys: [5, 12, 20, 33, 41, 50, 58, 67, 72, 85, 93, 98].map((at, i) => ({ id: `k${i + 1}`, at })),
    steps: [
      { caption: 'With hash % 3, every key has a fixed home.', servers: ['A', 'B', 'C'] },
      { caption: 'Add a fourth server and the divisor changes. Most keys now map somewhere else.', servers: ['A', 'B', 'C', 'D'] },
    ],
  }, 'The modulo problem'),

  'scrubber-layers': anim('scrubber', {
    kind: 'layers',
    layers: [
      { cmd: 'FROM node:20-alpine', cost: 3 },
      { cmd: 'WORKDIR /app' },
      { cmd: 'COPY package*.json ./', watch: ['package.json', 'package-lock.json'], cost: 1 },
      { cmd: 'RUN npm ci', cost: 30 },
      { cmd: 'COPY . .', watch: ['*'], cost: 2 },
      { cmd: 'CMD ["node", "server.js"]' },
    ],
    steps: [
      { caption: 'The first build has no cache, so every line runs.', edited: ['*initial*'] },
      { caption: 'Build again with no changes: every layer comes from the cache.', edited: [] },
      { caption: 'Edit one source file. Only the lines from COPY . . downwards run again.', edited: ['src/app.js'] },
      { caption: 'Change a dependency. npm ci and everything under it run again.', edited: ['package.json'] },
    ],
  }, 'The layer cache'),

  'scrubber-scan': anim('scrubber', {
    kind: 'scan', table: 'users', column: 'email',
    rows: ['mia', 'leo', 'kim', 'ana', 'zoe', 'raj', 'eli', 'omar', 'sam', 'tia', 'uma', 'ben', 'cy', 'dee', 'jo', 'pat'],
    target: 'kim',
    steps: [
      { caption: 'No index: the database reads rows one at a time.', mode: 'seq', n: 2 },
      { caption: 'It finds kim at row 3 but cannot know there is no second kim, so it keeps reading.', mode: 'seq', n: 3 },
      { caption: 'Every row was read to answer one lookup.', mode: 'seq', n: 16 },
      { caption: 'With an index: start at the root page. kim sorts between eli and mia.', mode: 'index', n: 1 },
      { caption: 'One leaf page holds the key and a pointer to its row.', mode: 'index', n: 2 },
      { caption: 'Three page reads instead of sixteen row reads.', mode: 'index', n: 3 },
    ],
  }, 'Scan or index'),

  'scrubber-git-merge': anim('scrubber', {
    kind: 'git',
    steps: [
      { caption: 'Two commits on main. HEAD points at main.', do: ['commit A', 'commit B'] },
      { caption: 'A new branch starts at B. Switching to it moves HEAD.', do: ['checkout -b feature'] },
      { caption: 'Commits now land on feature. Main stays put.', do: ['commit C', 'commit D'] },
      { caption: 'Meanwhile main moves on, so the histories have diverged.', do: ['checkout main', 'commit E'] },
      { caption: 'A merge commit joins both lines. It has two parents.', do: ['merge feature M'] },
    ],
  }, 'Branch and merge'),

  'scrubber-git-rebase': anim('scrubber', {
    kind: 'git',
    steps: [
      { caption: 'feature branched from B. Main then moved on to E.', do: ['commit A', 'commit B', 'checkout -b feature', 'commit C', 'commit D', 'checkout main', 'commit E'] },
      { caption: 'Rebase replays C and D on top of E as new commits. The old ones are orphaned.', do: ['checkout feature', 'rebase main'] },
      { caption: 'Main can now fast-forward: no merge commit, a straight line.', do: ['checkout main', 'merge feature'] },
    ],
  }, 'Rebase, then fast-forward'),

  'scrubber-jwt': anim('scrubber', {
    kind: 'jwt', secret: 'demo-secret', payload: { sub: '42', role: 'user', exp: 1893456000 },
    steps: [
      { caption: 'A JWT is three base64url parts joined by dots.', view: 'parts' },
      { caption: 'Header and payload are only encoded. Anyone can read them.', view: 'decode' },
      { caption: 'The signature is an HMAC of the first two parts, made with a secret.', view: 'sign' },
      { caption: 'Change role to admin and the old signature no longer matches.', view: 'tamper', tamper: { role: 'admin' } },
      { caption: 'Only someone holding the secret can sign a payload the server will accept.', view: 'resign', tamper: { role: 'admin' } },
    ],
  }, 'Inside a JWT'),
};
