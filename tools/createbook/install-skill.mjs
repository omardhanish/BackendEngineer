// Install the 786CreateBook skill: copies tools/createbook/SKILL.md to ~/.claude/skills/786createbook/SKILL.md, with this
// project's folder filled in. Run it again after changing SKILL.md (the copy in ~/.claude is what Claude Code reads).
//   node tools/createbook/install-skill.mjs            install or update
//   node tools/createbook/install-skill.mjs --check    say whether the installed copy matches (exit 1 if not)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = readFileSync(join(root, 'tools', 'createbook', 'SKILL.md'), 'utf8');
const text = source.replaceAll('{{PROJECT}}', root);
const dir = join(homedir(), '.claude', 'skills', '786createbook');
const target = join(dir, 'SKILL.md');

if (!/^---\nname: 786createbook\n/.test(text)) { console.error('✖ SKILL.md has lost its frontmatter (name: 786createbook)'); process.exit(1); }
if (text.includes('{{')) { console.error('✖ SKILL.md still has an unfilled {{placeholder}}'); process.exit(1); }

const installed = existsSync(target) ? readFileSync(target, 'utf8') : null;
if (process.argv.includes('--check')) {
  console.log(installed === text ? `✔ ${target} is up to date` : `✖ ${target} ${installed === null ? 'is not installed' : 'differs from tools/createbook/SKILL.md'}`);
  process.exit(installed === text ? 0 : 1);
}
mkdirSync(dir, { recursive: true });
writeFileSync(target, text);
console.log(`${installed === null ? 'installed' : installed === text ? 'already up to date:' : 'updated'} ${target}`);
console.log('Use it in Claude Code with:  /786createbook  <your topics and headings>');
