import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import { localStore } from '../data/localStore.js'

const router = Router()

function isMongoConnected() {
  return mongoose.connection.readyState === 1
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const normalizedEmail = String(email).toLowerCase()

    if (isMongoConnected()) {
      const existing = await User.findOne({ email: normalizedEmail })
      if (existing) return res.status(409).json({ error: 'Email already registered' })
      const passwordHash = await User.hashPassword(String(password))
      const user = await User.create({ name, email: normalizedEmail, passwordHash })
      const token = signToken(user._id)
      return res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
    } else {
      const existing = await localStore.findUserByEmail(normalizedEmail)
      if (existing) return res.status(409).json({ error: 'Email already registered' })
      const user = await localStore.createUser({ name, email: normalizedEmail, password })
      const token = signToken(user.id)
      return res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
    }
  } catch (e) {
    next(e)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    const normalizedEmail = String(email || '').toLowerCase()

    if (isMongoConnected()) {
      const user = await User.findOne({ email: normalizedEmail })
      if (!user || !(await user.comparePassword(String(password || '')))) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }
      const token = signToken(user._id)
      return res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
    } else {
      const user = await localStore.findUserByEmail(normalizedEmail)
      if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }
      const token = signToken(user.id)
      return res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
    }
  } catch (e) {
    next(e)
  }
})

router.post('/logout', (_req, res) => res.json({ ok: true }))

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      const user = await User.findById(req.userId).select('-passwordHash')
      if (!user) return res.status(404).json({ error: 'Not found' })
      return res.json({ user })
    } else {
      const user = await localStore.findUserById(req.userId)
      if (!user) return res.status(404).json({ error: 'Not found' })
      const { passwordHash, ...safeUser } = user
      return res.json({ user: safeUser })
    }
  } catch (e) {
    next(e)
  }
})

export default router
