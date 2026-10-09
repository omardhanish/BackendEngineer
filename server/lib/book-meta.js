// What a book is: the validated contents of content/books/<slug>/book.json, with defaults, plus the tutor wording.
// The tutor text for the original book is reproduced EXACTLY by its book.json, so its prompt prefix stays byte-stable.
import { BOOK_RE } from './security.js';

export const PROFILES = ['js', 'python', 'java', 'c', 'none', 'mixed'];

const text = (v, max, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback);

// a stable, pleasant default hue for a slug that does not choose one (never random: the same slug always looks the same)
export function hueFromSlug(slug) {
  let h = 7;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export const DEFAULT_TUTOR = Object.freeze({
  name: 'BackendEngineer',
  about: 'a short, crisp, book-style course that takes a learner from JavaScript fundamentals to production backends (Node.js, Express, SQL/Postgres/Drizzle, MongoDB, authentication, Docker, AWS, system design, Git)',
  examples: 'Node.js, Express, SQL',
  learnerRole: 'engineer',
  mentorRole: 'a senior engineer',
});

/** @returns the normalised metadata, or throws an Error with a message that says what is wrong with book.json */
export function normalizeBook(raw, slug) {
  if (!BOOK_RE.test(slug)) throw new Error(`"${slug}" is not a valid book folder name (lowercase letters, digits and dashes)`);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('book.json must be a JSON object');
  if (raw.slug !== undefined && raw.slug !== slug) throw new Error(`book.json says slug "${raw.slug}" but the folder is "${slug}"`);
  const title = text(raw.title, 80);
  if (!title) throw new Error('book.json needs a "title"');
  const hue = Number.isInteger(raw.hue) && raw.hue >= 0 && raw.hue < 360 ? raw.hue : hueFromSlug(slug);
  const profile = PROFILES.includes(raw.profile) ? raw.profile : 'js';
  const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'B';
  const t = raw.tutor && typeof raw.tutor === 'object' ? raw.tutor : {};
  const tutor = {
    name: text(t.name, 80, title),
    about: text(t.about, 600, `a short, crisp, book-style course on ${title}`),
    examples: text(t.examples, 160),
    learnerRole: text(t.learnerRole, 40, 'learner'),
    mentorRole: text(t.mentorRole, 60, 'an experienced mentor'),
  };
  const rt = raw.runtime && typeof raw.runtime === 'object' ? raw.runtime : {};
  return Object.freeze({
    slug,
    title,
    tagline: text(raw.tagline, 160),
    audience: text(raw.audience, 240),
    hue,
    order: Number.isFinite(raw.order) ? raw.order : 100,
    profile,
    locale: text(raw.locale, 12, 'en'),
    monogram: text(raw.monogram, 3, initials),
    tutor: Object.freeze(tutor),
    runtime: Object.freeze({
      bannedApis: Array.isArray(rt.bannedApis) ? rt.bannedApis.filter((x) => typeof x === 'string').slice(0, 40) : [],
      banHint: text(rt.banHint, 80),
    }),
  });
}
