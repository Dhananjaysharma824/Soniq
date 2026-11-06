import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { localStore } from '../data/localStore.js'

const router = Router()

function isMongoConnected() {
  return mongoose.connection.readyState === 1
}

router.get('/preferences', requireAuth, async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      const user = await User.findById(req.userId).select('preferences favourites recentlyPlayed')
      return res.json(user || {})
    } else {
      const user = await localStore.findUserById(req.userId)
      if (!user) return res.json({})
      return res.json({
        preferences: user.preferences || {},
        favourites: user.favourites || [],
        recentlyPlayed: user.recentlyPlayed || [],
      })
    }
  } catch (e) {
    next(e)
  }
})

router.put('/preferences', requireAuth, async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      const user = await User.findByIdAndUpdate(req.userId, { preferences: req.body || {} }, { new: true }).select('preferences')
      return res.json({ preferences: user?.preferences || {} })
    } else {
      const user = await localStore.updateUser(req.userId, { preferences: req.body || {} })
      return res.json({ preferences: user?.preferences || {} })
    }
  } catch (e) {
    next(e)
  }
})

router.post('/favourites', requireAuth, async (req, res, next) => {
  try {
    const { trackId } = req.body || {}
    if (!trackId) return res.status(400).json({ error: 'trackId required' })

    if (isMongoConnected()) {
      const user = await User.findById(req.userId)
      if (!user) return res.status(404).json({ error: 'Not found' })
      const has = user.favourites.includes(trackId)
      user.favourites = has ? user.favourites.filter((x) => x !== trackId) : [...user.favourites, trackId]
      await user.save()
      return res.json({ favourites: user.favourites })
    } else {
      const favourites = await localStore.toggleFavourite(req.userId, trackId)
      return res.json({ favourites })
    }
  } catch (e) {
    next(e)
  }
})

router.post('/recently-played', requireAuth, async (req, res, next) => {
  try {
    const { trackId } = req.body || {}
    if (!trackId) return res.status(400).json({ error: 'trackId required' })

    if (isMongoConnected()) {
      const user = await User.findById(req.userId)
      if (!user) return res.status(404).json({ error: 'Not found' })
      user.recentlyPlayed = [trackId, ...user.recentlyPlayed.filter((x) => x !== trackId)].slice(0, 50)
      await user.save()
      return res.json({ recentlyPlayed: user.recentlyPlayed })
    } else {
      const recentlyPlayed = await localStore.addRecentlyPlayed(req.userId, trackId)
      return res.json({ recentlyPlayed })
    }
  } catch (e) {
    next(e)
  }
})

export default router
