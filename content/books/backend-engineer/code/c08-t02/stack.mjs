import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Zod: describe valid input, then check a value against it.
console.log('zod:', z.email().safeParse('ada@example.com').success);

// bcryptjs: hash a password, then compare. A demo value, not a real password.
const hash = await bcrypt.hash('demo-password', 10);
console.log('bcryptjs:', await bcrypt.compare('demo-password', hash));

// jsonwebtoken: sign a token, then verify it. `demo-secret` is a demo value.
const token = jwt.sign({ sub: '1' }, 'demo-secret', { expiresIn: '1h' });
console.log('jsonwebtoken:', jwt.verify(token, 'demo-secret').sub);

// nanoid: a random short code. It changes every run, so print only its length.
console.log('nanoid:', nanoid(7).length);
