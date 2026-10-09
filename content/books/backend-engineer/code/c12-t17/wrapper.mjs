const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const handler = asyncHandler(async () => {
  throw new Error('db down');
});

const next = (error) => console.log('next received:', error.message);
handler({}, {}, next);
console.log('handler returned');
