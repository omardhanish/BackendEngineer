import app from './src/app.js';

const server = app.listen(0, async (err) => {
  if (err) throw err;
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log(method, path, res.status, await res.text());
  };
  const hyperion = { title: 'Hyperion', author: 'Dan Simmons', year: 1989 };
  await call('POST', '/books', { ...hyperion, year: 1898 });
  await call('PUT', '/books/4', { ...hyperion, id: 99 });
  await call('PUT', '/books/4', { title: 'Hyperion' });
  await call('PUT', '/books/9', hyperion);
  await call('DELETE', '/books/4');
  await call('DELETE', '/books/4');
  const list = await (await fetch(`${base}/books`)).json();
  console.log('ids left:', list.map((b) => b.id).join(' '));
  server.close();
});
