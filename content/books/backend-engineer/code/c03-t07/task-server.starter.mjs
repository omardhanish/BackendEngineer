import http from 'node:http';

const tasks = [];

const send = (res, status, data) =>
  res.writeHead(status, { 'Content-Type': 'application/json' })
    .end(data && JSON.stringify(data));

export const server = http.createServer(async (req, res) => {
  // Add one route at a time and run the tests after each:
  //   GET /tasks         -> 200 and the array of tasks
  //   POST /tasks        -> 201 and the new task, or 400
  //   DELETE /tasks/:id  -> 204, or 404 for an unknown id
  // Anything else gets the 404 below.
  send(res, 404, { error: 'not found' });
});
// Do not call server.listen here: the tests do that.
