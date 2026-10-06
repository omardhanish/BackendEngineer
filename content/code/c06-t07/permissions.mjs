const permissions = {
  user: ['books:read'],
  admin: ['books:read', 'books:write', 'users:read'],
};

const can = (role, action) =>
  Object.hasOwn(permissions, role) && permissions[role].includes(action);

const show = (role, action) => console.log(role, action, can(role, action));
show('user', 'books:read');
show('user', 'books:write');
show('admin', 'books:write');
show('editor', 'books:read'); // a role nobody defined
