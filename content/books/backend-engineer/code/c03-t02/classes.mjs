const names = {
  200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
  500: 'Internal Server Error', 503: 'Service Unavailable',
};
const kinds = ['', '', 'success', 'redirect', 'client error', 'server error'];

for (const [code, name] of Object.entries(names)) {
  console.log(code, name, '->', kinds[Math.floor(code / 100)]);
}
