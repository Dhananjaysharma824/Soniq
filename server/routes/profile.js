import { Router } from 'express'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/preferences', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('preferences favourites recentlyPlayed')
    res.json(user || {})
  } catch (e) { next(e) }
})

router.put('/preferences', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.userId, { preferences: req.body || {} }, { new: true }).select('preferences')
    res.json({ preferences: user?.preferences || {} })
  } catch (e) { next(e) }
})

router.post('/favourites', requireAuth, async (req, res, next) => {
  try {
    const { trackId } = req.body || {}
    if (!trackId) return res.status(400).json({ error: 'trackId required' })
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ error: 'Not found' })
    const has = user.favourites.includes(trackId)
    user.favourites = has ? user.favourites.filter((x) => x !== trackId) : [...user.favourites, trackId]
    await user.save()
    res.json({ favourites: user.favourites })
  } catch (e) { next(e) }
})

router.post('/recently-played', requireAuth, async (req, res, next) => {
  try {
    const { trackId } = req.body || {}
    if (!trackId) return res.status(400).json({ error: 'trackId required' })
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ error: 'Not found' })
    user.recentlyPlayed = [trackId, ...user.recentlyPlayed.filter((x) => x !== trackId)].slice(0, 50)
    await user.save()
    res.json({ recentlyPlayed: user.recentlyPlayed })
  } catch (e) { next(e) }
})

export default router
