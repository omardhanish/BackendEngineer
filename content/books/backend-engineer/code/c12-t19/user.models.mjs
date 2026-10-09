import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullname: String,
  password: { type: String, required: true },
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

const User = mongoose.model('User', userSchema);
await mongoose.connect(process.env.MONGO_URI);

const user = await User.create({ username: 'ada', password: 'demo-pass' });
console.log('stored as plain text:', user.password === 'demo-pass');
console.log('hash matches:', await bcrypt.compare('demo-pass', user.password));

const hash = user.password;
user.fullname = 'Ada Lovelace';
await user.save();
console.log('hash unchanged:', user.password === hash);

await mongoose.disconnect();
