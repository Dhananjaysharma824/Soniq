import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'soniq-dev-secret')
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET || 'soniq-dev-secret', { expiresIn: '30d' })
}
