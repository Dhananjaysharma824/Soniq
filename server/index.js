import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import playlistRoutes from './routes/playlists.js'
import musicRoutes from './routes/music.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')

const app = express()
const corsOrigin = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*' ? process.env.CORS_ORIGIN : true
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'soniq-api', status: 'online' }))
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/playlists', playlistRoutes)
app.use('/api/music', musicRoutes)

// API 404 handler for unrecognized API endpoints
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

// Serve frontend build if dist folder exists (Production / Fullstack Deployment)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

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
