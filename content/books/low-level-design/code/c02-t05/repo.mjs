class UserRepo {
  find(id) { console.log(`  db read ${id}`); return { id, name: 'Ada' }; }
}
class CachedRepo {
  #inner; #cache = new Map();
  constructor(inner) { this.#inner = inner; }
  find(id) {
    if (!this.#cache.has(id)) this.#cache.set(id, this.#inner.find(id));
    return this.#cache.get(id);
  }
}
class LoggedRepo {
  #inner;
  constructor(inner) { this.#inner = inner; }
  find(id) { console.log(`find ${id}`); return this.#inner.find(id); }
}
const repo = new LoggedRepo(new CachedRepo(new UserRepo()));
repo.find('u1');
console.log(repo.find('u1').name);
