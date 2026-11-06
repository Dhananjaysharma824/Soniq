import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import playlistRoutes from './routes/playlists.js'
import musicRoutes from './routes/music.js'

dotenv.config()

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'soniq-api' }))
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/playlists', playlistRoutes)
app.use('/api/music', musicRoutes)

// Fallback: functional local/demo mode if DB not configured
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 4000
const MONGO = process.env.MONGODB_URI

async function start() {
  if (MONGO) {
    try {
      await mongoose.connect(MONGO)
      console.log('MongoDB connected')
    } catch (e) {
      console.warn('MongoDB connection failed; running in limited mode.', e.message)
    }
  } else {
    console.log('MONGODB_URI not set; running without database (demo/local fallback).')
  }
  app.listen(PORT, () => console.log(`SONIQ API listening on :${PORT}`))
}

start()
