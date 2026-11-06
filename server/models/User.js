import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const schema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    favourites: [{ type: String }],
    recentlyPlayed: [{ type: String }],
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

schema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash)
}

schema.statics.hashPassword = function (pw) {
  return bcrypt.hash(pw, 10)
}

export default mongoose.model('User', schema)
