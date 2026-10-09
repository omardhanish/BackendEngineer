// Every URL in one place. A page address is /b/<book>/…; the library itself is /.
// (The original /read/…, /c/… and /chats URLs still work: the router sends them to the default book.)
import { state } from './state.js';

const base = (slug) => `/b/${slug ?? state.slug}`;

export const paths = {
  library: () => '/',
  book: (slug) => base(slug),
  chapter: (id, slug) => `${base(slug)}/c/${id}`,
  read: (id, frame, slug) => `${base(slug)}/read/${id}${frame ? `/${frame}` : ''}`,
  chats: (query = '', slug) => `${base(slug)}/chats${query ? `?${query}` : ''}`,
  api: (slug) => `/api/books/${slug ?? state.slug}`,
};
