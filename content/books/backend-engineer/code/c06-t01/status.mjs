const roles = new Map([['ada', 'user'], ['root', 'admin']]);

function handle(username, action) {
  const role = roles.get(username);
  if (!role) return 401; // authentication failed: who are you?
  if (action === 'delete' && role !== 'admin') return 403; // not allowed
  return 200;
}

for (const [who, action] of [
  [undefined, 'delete'], ['ada', 'read'], ['ada', 'delete'], ['root', 'delete'],
]) {
  console.log(who ?? 'nobody', action, handle(who, action));
}
