class AppError extends Error { name = this.constructor.name; }
class NotFoundError extends AppError {}
class ValidationError extends AppError {}
function findUser(id) {
  if (!Number.isInteger(id)) throw new ValidationError(`bad id: ${id}`);
  throw new NotFoundError(`no user ${id}`);
}
const STATUS = [[NotFoundError, 404], [ValidationError, 400]];
for (const id of [7, 'x']) {
  try { findUser(id); } catch (e) {
    const code = STATUS.find(([T]) => e instanceof T)?.[1] ?? 500;
    console.log(code, e.name, e.message);
  }
}
