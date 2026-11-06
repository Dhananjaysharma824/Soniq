import { Router } from 'express'
import Playlist from '../models/Playlist.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try { res.json({ playlists: await Playlist.find({ userId: req.userId }).sort({ updatedAt: -1 }) }) } catch (e) { next(e) }
})
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description, tracks } = req.body || {}
    if (!name) return res.status(400).json({ error: 'Name required' })
    const playlist = await Playlist.create({ userId: req.userId, name, description, tracks: tracks || [] })
    res.json({ playlist })
  } catch (e) { next(e) }
})
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const p = await Playlist.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body || {}, { new: true })
    if (!p) return res.status(404).json({ error: 'Not found' })
    res.json({ playlist: p })
  } catch (e) { next(e) }
})
router.delete('/:id', requireAuth, async (req, res, next) => {
  try { await Playlist.deleteOne({ _id: req.params.id, userId: req.userId }); res.json({ ok: true }) } catch (e) { next(e) }
})

export default router
