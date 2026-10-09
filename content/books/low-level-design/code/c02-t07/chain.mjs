class Handler {
  #next = null;
  setNext(h) { this.#next = h; return h; }
  handle(req) { return this.#next ? this.#next.handle(req) : 'unhandled'; }
}
class Auth extends Handler {
  handle(req) { return req.token ? super.handle(req) : '401 no token'; }
}
class Limit extends Handler {
  handle(req) { return req.calls > 3 ? '429 slow down' : super.handle(req); }
}
class Route extends Handler { handle(req) { return `200 ${req.path}`; } }
const chain = new Auth();
chain.setNext(new Limit()).setNext(new Route());
for (const req of [{ path: '/a', token: 't', calls: 1 },
  { path: '/b', calls: 9 }, { path: '/c', token: 't', calls: 9 }])
  console.log(chain.handle(req));
