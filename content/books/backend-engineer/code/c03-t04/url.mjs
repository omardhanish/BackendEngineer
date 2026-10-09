const url = new URL('/notes/2?limit=5&sort=new', 'http://localhost');

console.log(url.pathname);
const limit = url.searchParams.get('limit');
console.log(limit, typeof limit);
console.log(url.searchParams.get('page'));
const [, resource, id] = url.pathname.split('/');
console.log(resource, id);
