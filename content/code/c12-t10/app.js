import express from 'express';

const app = express();

app.get('/', (req, res) => res.send('auth-backend is running'));

export default app;
