// The code languages a page may use. ONE list feeds the validator (which ids are allowed), the syntax highlighter
// (which Prism grammar to load: tools/build-vendor.mjs) and the code window label. Plain data, no imports.
//   label    what the learner sees on the code window
//   prism    the Prism grammar that highlights it (null = shown without colours)
//   aliases  other names an author might write in `lang`
//   long     true = may be a little longer (18 lines instead of 14): config-like text
export const LANGUAGES = {
  js: { label: 'JavaScript', prism: 'javascript', aliases: ['javascript', 'mjs', 'cjs', 'jsx', 'node'] },
  ts: { label: 'TypeScript', prism: 'typescript', aliases: ['typescript'] },
  json: { label: 'JSON', prism: 'json', aliases: ['jsonc'] },
  bash: { label: 'Shell', prism: 'bash', aliases: ['sh', 'shell', 'zsh', 'console'] },
  sql: { label: 'SQL', prism: 'sql', aliases: ['psql', 'postgres'], long: true },
  yaml: { label: 'YAML', prism: 'yaml', aliases: ['yml'], long: true },
  docker: { label: 'Dockerfile', prism: 'docker', aliases: ['dockerfile'], long: true },
  http: { label: 'HTTP', prism: 'http', aliases: [] },
  html: { label: 'HTML', prism: 'markup', aliases: ['xml', 'svg'] },
  ejs: { label: 'EJS', prism: 'markup', aliases: [] },
  css: { label: 'CSS', prism: 'css', aliases: [] },
  diff: { label: 'Diff', prism: 'diff', aliases: [] },
  python: { label: 'Python', prism: 'python', aliases: ['py'] },
  java: { label: 'Java', prism: 'java', aliases: [] },
  c: { label: 'C', prism: 'c', aliases: ['h'] },
  cpp: { label: 'C++', prism: 'cpp', aliases: ['c++', 'cc', 'hpp'] },
  csharp: { label: 'C#', prism: 'csharp', aliases: ['cs', 'c#'] },
  go: { label: 'Go', prism: 'go', aliases: ['golang'] },
  rust: { label: 'Rust', prism: 'rust', aliases: ['rs'] },
  ruby: { label: 'Ruby', prism: 'ruby', aliases: ['rb'] },
  php: { label: 'PHP', prism: 'php', aliases: [] },
  kotlin: { label: 'Kotlin', prism: 'kotlin', aliases: ['kt'] },
  swift: { label: 'Swift', prism: 'swift', aliases: [] },
  markdown: { label: 'Markdown', prism: 'markdown', aliases: ['md'] },
  text: { label: 'Text', prism: null, aliases: ['txt', 'plain', 'output'] },
};

/** alias or id -> canonical id (or undefined for a language we do not know) */
export const LANGUAGE_ID = (() => {
  const m = new Map();
  for (const [id, l] of Object.entries(LANGUAGES)) { m.set(id, id); for (const a of l.aliases) m.set(a, id); }
  return (name) => m.get(String(name).toLowerCase());
})();
