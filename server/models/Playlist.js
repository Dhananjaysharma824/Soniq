import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tracks: [
      {
        id: String,
        title: String,
        artist: String,
        album: String,
        duration: Number,
        src: String,
        artwork: String,
      },
    ],
  },
  { timestamps: true },
)

export default mongoose.model('Playlist', schema)
