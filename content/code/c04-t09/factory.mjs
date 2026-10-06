const requireRole = (role) => (user) => {
  if (user.role !== role) return `${user.name}: denied, needs ${role}`;
  return `${user.name}: allowed`;
};

const adminOnly = requireRole('admin');
const editorOnly = requireRole('editor');

console.log(adminOnly({ name: 'Ana', role: 'admin' }));
console.log(adminOnly({ name: 'Bo', role: 'editor' }));
console.log(editorOnly({ name: 'Bo', role: 'editor' }));
