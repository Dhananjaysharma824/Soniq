import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, 'store.json')

function loadData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Error reading store.json, using defaults:', err.message)
  }
  return { users: [], playlists: [] }
}

function saveData(data) {
  try {
    const dir = path.dirname(DB_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error saving store.json:', err.message)
  }
}

export const localStore = {
  // Users
  async findUserByEmail(email) {
    const db = loadData()
    return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null
  },

  async findUserById(id) {
    const db = loadData()
    return db.users.find((u) => u.id === String(id) || u._id === String(id)) || null
  },

  async createUser({ name, email, password }) {
    const db = loadData()
    const passwordHash = await bcrypt.hash(String(password), 10)
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    const user = {
      _id: id,
      id,
      name: name || email.split('@')[0],
      email: String(email).toLowerCase(),
      passwordHash,
      favourites: [],
      recentlyPlayed: [],
      preferences: {},
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    saveData(db)
    return user
  },

  async updateUser(id, updates) {
    const db = loadData()
    const idx = db.users.findIndex((u) => u.id === String(id) || u._id === String(id))
    if (idx === -1) return null
    db.users[idx] = { ...db.users[idx], ...updates, updatedAt: new Date().toISOString() }
    saveData(db)
    return db.users[idx]
  },

  async toggleFavourite(userId, trackId) {
    const db = loadData()
    const user = db.users.find((u) => u.id === String(userId) || u._id === String(userId))
    if (!user) return []
    user.favourites = user.favourites || []
    const has = user.favourites.includes(trackId)
    user.favourites = has ? user.favourites.filter((x) => x !== trackId) : [...user.favourites, trackId]
    saveData(db)
    return user.favourites
  },

  async addRecentlyPlayed(userId, trackId) {
    const db = loadData()
    const user = db.users.find((u) => u.id === String(userId) || u._id === String(userId))
    if (!user) return []
    user.recentlyPlayed = user.recentlyPlayed || []
    user.recentlyPlayed = [trackId, ...user.recentlyPlayed.filter((x) => x !== trackId)].slice(0, 50)
    saveData(db)
    return user.recentlyPlayed
  },

  // Playlists
  async getPlaylists(userId) {
    const db = loadData()
    return db.playlists
      .filter((p) => String(p.userId) === String(userId))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
  },

  async createPlaylist(userId, { name, description, tracks = [] }) {
    const db = loadData()
    const id = `pl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    const playlist = {
      _id: id,
      id,
      userId: String(userId),
      name: name.trim(),
      description: description || '',
      tracks: tracks || [],
      trackIds: tracks.map((t) => t.id || t),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.playlists.push(playlist)
    saveData(db)
    return playlist
  },

  async updatePlaylist(id, userId, updates) {
    const db = loadData()
    const idx = db.playlists.findIndex(
      (p) => (p.id === String(id) || p._id === String(id)) && String(p.userId) === String(userId),
    )
    if (idx === -1) return null
    const existing = db.playlists[idx]
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    if (updates.tracks) {
      updated.trackIds = updates.tracks.map((t) => t.id || t)
    }
    db.playlists[idx] = updated
    saveData(db)
    return updated
  },

  async deletePlaylist(id, userId) {
    const db = loadData()
    db.playlists = db.playlists.filter(
      (p) => !((p.id === String(id) || p._id === String(id)) && String(p.userId) === String(userId)),
    )
    saveData(db)
    return true
  },
}
