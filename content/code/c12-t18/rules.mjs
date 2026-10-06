import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, 'Password is required'] },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const User = mongoose.model('User', userSchema);

await mongoose.connect(process.env.MONGO_URI);
await User.init();

const input = { username: '  ADA ', password: 'demo-password', role: 'admin' };
const ada = await User.create(input);
console.log(ada.username, ada.isEmailVerified, ada.role);
console.log(ada.createdAt instanceof Date);

const invalid = await new User({}).validate().catch((error) => error);
console.log(invalid.name, invalid.errors.password.message);

const dup = await User.create({ ...input, username: 'ADA' }).catch((e) => e);
console.log(dup.name, dup.code);
await mongoose.disconnect();
