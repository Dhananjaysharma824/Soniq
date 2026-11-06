import { Router } from 'express'
import User from '../models/User.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const existing = await User.findOne({ email: String(email).toLowerCase() })
    if (existing) return res.status(409).json({ error: 'Email already registered' })
    const passwordHash = await User.hashPassword(String(password))
    const user = await User.create({ name, email, passwordHash })
    const token = signToken(user._id)
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (e) { next(e) }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    const user = await User.findOne({ email: String(email || '').toLowerCase() })
    if (!user || !(await user.comparePassword(String(password || '')))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = signToken(user._id)
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (e) { next(e) }
})

router.post('/logout', (_req, res) => res.json({ ok: true }))
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash')
    if (!user) return res.status(404).json({ error: 'Not found' })
    res.json({ user })
  } catch (e) { next(e) }
})

export default router
