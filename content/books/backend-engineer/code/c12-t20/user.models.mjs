import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: String,
  password: { type: String, required: true },
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
await mongoose.connect(process.env.MONGO_URI);
await User.create({
  username: 'ada',
  password: await bcrypt.hash('demo-pass', 10),
});

const user = await User.findOne({ username: 'ada' });
console.log('right password:', await user.isPasswordCorrect('demo-pass'));
console.log('wrong password:', await user.isPasswordCorrect('guess'));
console.log('on the model:', typeof User.isPasswordCorrect);

await mongoose.disconnect();
