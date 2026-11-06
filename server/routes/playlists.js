import { Router } from 'express'
import mongoose from 'mongoose'
import Playlist from '../models/Playlist.js'
import { requireAuth } from '../middleware/auth.js'
import { localStore } from '../data/localStore.js'

const router = Router()

function isMongoConnected() {
  return mongoose.connection.readyState === 1
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      const playlists = await Playlist.find({ userId: req.userId }).sort({ updatedAt: -1 })
      return res.json({ playlists })
    } else {
      const playlists = await localStore.getPlaylists(req.userId)
      return res.json({ playlists })
    }
  } catch (e) {
    next(e)
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description, tracks } = req.body || {}
    if (!name) return res.status(400).json({ error: 'Name required' })

    if (isMongoConnected()) {
      const playlist = await Playlist.create({ userId: req.userId, name, description, tracks: tracks || [] })
      return res.json({ playlist })
    } else {
      const playlist = await localStore.createPlaylist(req.userId, { name, description, tracks: tracks || [] })
      return res.json({ playlist })
    }
  } catch (e) {
    next(e)
  }
})

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      const p = await Playlist.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body || {}, { new: true })
      if (!p) return res.status(404).json({ error: 'Not found' })
      return res.json({ playlist: p })
    } else {
      const p = await localStore.updatePlaylist(req.params.id, req.userId, req.body || {})
      if (!p) return res.status(404).json({ error: 'Not found' })
      return res.json({ playlist: p })
    }
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      await Playlist.deleteOne({ _id: req.params.id, userId: req.userId })
      return res.json({ ok: true })
    } else {
      await localStore.deletePlaylist(req.params.id, req.userId)
      return res.json({ ok: true })
    }
  } catch (e) {
    next(e)
  }
})

export default router
