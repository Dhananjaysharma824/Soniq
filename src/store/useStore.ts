import { create } from 'zustand'
import type { MutableRefObject } from 'react'
import { audioEngine, type AudioAnalysis } from '@/audio/AudioEngine'
import { demoTracks } from '@/data/demoTracks'

const DEMO_IDS = new Set(demoTracks.map((t) => t.id))
import {
  apiCreatePlaylist,
  apiUpdatePlaylist,
  apiDeletePlaylist,
  apiToggleFavourite,
} from '@/services/userSync'

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  src: string
  artwork?: string
  isLocal?: boolean
  genre?: string
  licenseUrl?: string
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
}

export type WorldId = 'space' | 'ocean' | 'dream' | 'tunnel'
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra'

export interface VisualizerSettings {
  bassSensitivity: number
  midSensitivity: number
  trebleSensitivity: number
  beatIntensity: number
  particleDensity: number
  deformation: number
  cameraMotion: number
  intensity: number
  quality: QualityLevel
  reducedMotion: boolean
}

interface MusicState {
  tracks: Track[]
  queue: Track[]
  currentIndex: number
  isPlaying: boolean
  isBuffering: boolean
  playbackError: string | null
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  playbackRate: number
  recentlyPlayed: string[]
  favourites: string[]
  playlists: Playlist[]
  // 3D
  world: WorldId
  settings: VisualizerSettings
  // Shared ref for 3D frame loop (no React re-renders)
  analysisRef: MutableRefObject<AudioAnalysis> | null
  setAnalysisRef: (ref: MutableRefObject<AudioAnalysis>) => void
  // Actions
  setTracks: (t: Track[]) => void
  addTracks: (t: Track[]) => void
  playTrack: (index: number, queue?: Track[]) => void
  playTrackDirect: (track: Track) => void
  togglePlay: () => void
  setPlaying: (v: boolean) => void
  next: () => void
  prev: () => void
  seek: (time: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setPlaybackRate: (r: number) => void
  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void
  setBuffering: (b: boolean) => void
  setPlaybackError: (e: string | null) => void
  setWorld: (w: WorldId) => void
  updateSettings: (s: Partial<VisualizerSettings>) => void
  toggleFavourite: (id: string, track?: Track) => void
  addToRecentlyPlayed: (id: string) => void
  // Playlists
  createPlaylist: (name: string, description?: string) => Playlist
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addTrackToPlaylist: (playlistId: string, track: Track | string) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  // Queue actions
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
}

const defaultSettings: VisualizerSettings = {
  bassSensitivity: 1.0,
  midSensitivity: 1.0,
  trebleSensitivity: 1.0,
  beatIntensity: 1.0,
  particleDensity: 1.0,
  deformation: 0.85,
  cameraMotion: 0.5,
  intensity: 1.0,
  quality: 'high',
  reducedMotion: false,
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem('soniq-prefs')
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function savePrefs(partial: Record<string, unknown>) {
  try {
    const prev = loadPrefs()
    localStorage.setItem('soniq-prefs', JSON.stringify({ ...prev, ...partial }))
  } catch {
    /* ignore */
  }
}

const prefs = loadPrefs()
const rawSavedTracks: Record<string, Track> = prefs.savedTracks ?? {}
const initialSavedTracks: Record<string, Track> = {}
for (const [k, v] of Object.entries(rawSavedTracks)) {
  if (!DEMO_IDS.has(k) && !v.src?.includes('soundhelix.com') && !v.src?.includes('wikivky/musicplayer')) {
    initialSavedTracks[k] = v
  }
}

// Restore saved queue across page reloads
const rawQueue: Track[] = Array.isArray(prefs.queue) ? prefs.queue : []
const initialQueue: Track[] = rawQueue.filter(
  (t) => t && t.id && !DEMO_IDS.has(t.id) && !t.src?.includes('soundhelix.com') && !t.src?.includes('wikivky/musicplayer'),
)
const initialIndex: number =
  typeof prefs.currentIndex === 'number' && prefs.currentIndex >= 0 && prefs.currentIndex < initialQueue.length
    ? prefs.currentIndex
    : initialQueue.length > 0
      ? 0
      : -1

const initialTrack = initialIndex >= 0 ? initialQueue[initialIndex] : null

export const useStore = create<MusicState>((set, get) => ({
  tracks: Object.values(initialSavedTracks),
  queue: initialQueue,
  currentIndex: initialIndex,
  isPlaying: false,
  isBuffering: false,
  playbackError: null,
  currentTime: 0,
  duration: initialTrack?.duration || 0,
  volume: prefs.volume ?? 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  playbackRate: 1,
  recentlyPlayed: prefs.recentlyPlayed ?? [],
  favourites: prefs.favourites ?? [],
  playlists: prefs.playlists ?? [],
  world: (prefs.world as WorldId) ?? 'space',
  settings: { ...defaultSettings, ...(prefs.settings ?? {}) },
  analysisRef: null,
  setAnalysisRef: (ref) => set({ analysisRef: ref }),

  setTracks: (t) => {
    // Merge without duplicates & persist into savedTracks
    set((s) => {
      const map = new Map<string, Track>()
      s.tracks.forEach((x) => map.set(x.id, x))
      t.forEach((x) => map.set(x.id, x))
      const merged = Array.from(map.values())

      const saved = { ...(loadPrefs().savedTracks || {}) }
      merged.forEach((item) => {
        saved[item.id] = item
      })
      savePrefs({ savedTracks: saved })
      return { tracks: merged }
    })
  },

  addTracks: (t) => set((s) => {
    const map = new Map<string, Track>()
    t.forEach((x) => map.set(x.id, x))
    s.tracks.forEach((x) => map.set(x.id, x))
    const merged = Array.from(map.values())

    const saved = { ...(loadPrefs().savedTracks || {}) }
    merged.forEach((item) => {
      saved[item.id] = item
    })
    savePrefs({ savedTracks: saved })

    return {
      tracks: merged,
    }
  }),

  playTrack: async (index, queue) => {
    const q = queue ?? get().queue
    const track = q[index]
    if (!track) return

    set({
      currentIndex: index,
      queue: q,
      isPlaying: true,
      currentTime: 0,
      duration: track.duration || 0,
      playbackError: null,
      isBuffering: true,
    })
    savePrefs({ queue: q, currentIndex: index })

    let el = audioEngine.getAudioElement()
    if (!el) {
      el = await audioEngine.init()
    }
    await audioEngine.resume()

    if (el) {
      el.muted = get().muted
      const vol = get().muted ? 0 : get().volume
      audioEngine.setVolume(vol)
      audioEngine.loadSource(track.src)
      el.playbackRate = get().playbackRate
      try {
        await el.play()
        await audioEngine.resume()
        set({ isBuffering: false, isPlaying: true, playbackError: null })
      } catch (err: unknown) {
        const error = err as Error
        console.warn('Playback error or blocked by autoplay:', error)
        set({ isBuffering: false, playbackError: 'Click Play button to activate sound.' })
      }
    }

    // Also store track into tracks library if not already present
    get().setTracks([track])
    get().addToRecentlyPlayed(track.id)
  },

  playTrackDirect: (track: Track) => {
    const { queue } = get()
    const cleanQueue = queue.filter(
      (t) => !DEMO_IDS.has(t.id) && !t.src?.includes('soundhelix.com') && !t.src?.includes('wikivky/musicplayer'),
    )
    const idx = cleanQueue.findIndex((t) => t.id === track.id)
    if (idx >= 0) {
      set({ queue: cleanQueue })
      savePrefs({ queue: cleanQueue, currentIndex: idx })
      get().playTrack(idx, cleanQueue)
    } else {
      const nextQueue = [...cleanQueue, track]
      set({ queue: nextQueue })
      savePrefs({ queue: nextQueue, currentIndex: nextQueue.length - 1 })
      get().playTrack(nextQueue.length - 1, nextQueue)
    }
  },

  togglePlay: async () => {
    let el = audioEngine.getAudioElement()
    if (!el) {
      el = await audioEngine.init()
    }
    await audioEngine.resume()

    const { isPlaying, queue, currentIndex } = get()
    const currentTrack = queue[currentIndex] ?? queue[0]

    if (isPlaying) {
      el?.pause()
      set({ isPlaying: false })
    } else {
      if (!currentTrack) return
      // If audio element has no source or is on a different track, initialize playback properly
      if (!el.src || (currentTrack && !el.src.includes(encodeURI(currentTrack.src)) && el.src !== currentTrack.src)) {
        get().playTrack(currentIndex >= 0 ? currentIndex : 0)
        return
      }
      el.play()
        .then(() => {
          set({ isPlaying: true, isBuffering: false, playbackError: null })
        })
        .catch((err) => {
          console.warn('Playback resume failed:', err)
          get().playTrack(currentIndex >= 0 ? currentIndex : 0)
        })
    }
  },

  setPlaying: (v) => set({ isPlaying: v }),
  setBuffering: (b) => set({ isBuffering: b }),
  setPlaybackError: (e) => set({ playbackError: e }),

  next: () => {
    const { queue, currentIndex, shuffle, repeat } = get()
    if (queue.length === 0) return
    if (repeat === 'one') {
      const el = audioEngine.getAudioElement()
      if (el) { el.currentTime = 0; el.play().catch(() => {}) }
      return
    }
    let nextIdx: number
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length)
    } else {
      nextIdx = currentIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0
        else { set({ isPlaying: false }); return }
      }
    }
    get().playTrack(nextIdx)
  },

  prev: () => {
    const { queue, currentIndex } = get()
    if (queue.length === 0) return
    const el = audioEngine.getAudioElement()
    if (el && el.currentTime > 3) {
      el.currentTime = 0
      return
    }
    const prevIdx = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1
    get().playTrack(prevIdx)
  },

  seek: (time) => {
    const el = audioEngine.getAudioElement()
    if (el && Number.isFinite(time)) {
      try {
        el.currentTime = time
      } catch (err) {
        console.warn('Seek error:', err)
      }
      set({ currentTime: time })
    }
  },

  setVolume: (v) => {
    const vol = Math.max(0, Math.min(1, v))
    const el = audioEngine.getAudioElement()
    if (el) {
      el.muted = vol === 0
    }
    audioEngine.setVolume(vol)
    set({ volume: vol, muted: vol === 0 })
    savePrefs({ volume: vol })
    audioEngine.resume()
  },

  toggleMute: () => {
    const { muted, volume } = get()
    const nextMuted = !muted
    const nextVol = nextMuted ? 0 : (volume || 0.8)
    const el = audioEngine.getAudioElement()
    if (el) {
      el.muted = nextMuted
    }
    audioEngine.setVolume(nextVol)
    set({ muted: nextMuted, volume: nextVol })
    savePrefs({ volume: nextVol })
    audioEngine.resume()
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
  setPlaybackRate: (r) => {
    const el = audioEngine.getAudioElement()
    if (el) el.playbackRate = r
    set({ playbackRate: r })
  },
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),

  setWorld: (w) => {
    set({ world: w })
    savePrefs({ world: w })
  },
  updateSettings: (s) => {
    set((state) => {
      const next = { ...state.settings, ...s }
      savePrefs({ settings: next })
      return { settings: next }
    })
  },
  toggleFavourite: (id, track) => {
    set((s) => {
      const fav = s.favourites.includes(id) ? s.favourites.filter((x) => x !== id) : [...s.favourites, id]
      const saved = { ...(loadPrefs().savedTracks || {}) }
      if (track) {
        saved[track.id] = track
      } else {
        const found = s.tracks.find((t) => t.id === id)
        if (found) saved[found.id] = found
      }
      savePrefs({ favourites: fav, savedTracks: saved })
      apiToggleFavourite(id).catch(() => {})
      return { favourites: fav, tracks: Object.values(saved) }
    })
  },
  addToRecentlyPlayed: (id) => {
    set((s) => {
      const next = [id, ...s.recentlyPlayed.filter((x) => x !== id)].slice(0, 40)
      savePrefs({ recentlyPlayed: next })
      return { recentlyPlayed: next }
    })
  },

  // Playlists
  createPlaylist: (name: string, description = '') => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim() || 'Untitled Playlist',
      trackIds: [],
      createdAt: Date.now(),
    }
    set((s) => {
      const next = [newPl, ...s.playlists]
      savePrefs({ playlists: next })
      return { playlists: next }
    })
    apiCreatePlaylist(name, description).catch(() => {})
    return newPl
  },

  renamePlaylist: (id, name) => {
    set((s) => {
      const trimmed = name.trim()
      const next = s.playlists.map((p) => (p.id === id ? { ...p, name: trimmed || p.name } : p))
      savePrefs({ playlists: next })
      apiUpdatePlaylist(id, { name: trimmed }).catch(() => {})
      return { playlists: next }
    })
  },

  deletePlaylist: (id) => {
    set((s) => {
      const next = s.playlists.filter((p) => p.id !== id)
      savePrefs({ playlists: next })
      apiDeletePlaylist(id).catch(() => {})
      return { playlists: next }
    })
  },

  addTrackToPlaylist: (playlistId, track) => {
    const trackId = typeof track === 'string' ? track : track.id
    set((s) => {
      const saved = { ...(loadPrefs().savedTracks || {}) }
      if (typeof track !== 'string') {
        saved[track.id] = track
      } else {
        const found = s.tracks.find((t) => t.id === track)
        if (found) saved[found.id] = found
      }
      const next = s.playlists.map((p) => {
        if (p.id !== playlistId) return p
        if (p.trackIds.includes(trackId)) return p
        return { ...p, trackIds: [...p.trackIds, trackId] }
      })
      savePrefs({ playlists: next, savedTracks: saved })

      const updatedPl = next.find((p) => p.id === playlistId)
      if (updatedPl) {
        const currentTracks = updatedPl.trackIds.map((id) => saved[id]).filter(Boolean) as Track[]
        apiUpdatePlaylist(playlistId, { tracks: currentTracks }).catch(() => {})
      }

      return { playlists: next, tracks: Object.values(saved) }
    })
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    set((s) => {
      const next = s.playlists.map((p) => {
        if (p.id !== playlistId) return p
        return { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) }
      })
      savePrefs({ playlists: next })

      const updatedPl = next.find((p) => p.id === playlistId)
      if (updatedPl) {
        const saved = loadPrefs().savedTracks || {}
        const currentTracks = updatedPl.trackIds.map((id) => saved[id]).filter(Boolean) as Track[]
        apiUpdatePlaylist(playlistId, { tracks: currentTracks }).catch(() => {})
      }

      return { playlists: next }
    })
  },

  // Queue actions
  addToQueue: (track) => {
    const { queue, currentIndex } = get()
    const cleanQueue = queue.filter(
      (t) => !DEMO_IDS.has(t.id) && !t.src?.includes('soundhelix.com') && !t.src?.includes('wikivky/musicplayer'),
    )
    if (cleanQueue.some((t) => t.id === track.id)) {
      set({ queue: cleanQueue })
      savePrefs({ queue: cleanQueue })
      return
    }
    const nextQueue = [...cleanQueue, track]
    const nextIdx = currentIndex === -1 ? 0 : currentIndex
    set({
      queue: nextQueue,
      currentIndex: nextIdx,
    })
    savePrefs({ queue: nextQueue, currentIndex: nextIdx })
    get().setTracks([track])
  },

  removeFromQueue: (index) => {
    const { queue, currentIndex, isPlaying } = get()
    const q = queue.filter((_, i) => i !== index)
    if (q.length === 0) {
      const el = audioEngine.getAudioElement()
      el?.pause()
      set({ queue: [], currentIndex: -1, isPlaying: false, currentTime: 0, duration: 0, playbackError: null })
      savePrefs({ queue: [], currentIndex: -1 })
      return
    }

    if (index === currentIndex) {
      const nextIndex = index >= q.length ? q.length - 1 : index
      set({ queue: q, currentIndex: nextIndex })
      savePrefs({ queue: q, currentIndex: nextIndex })
      if (isPlaying) {
        get().playTrack(nextIndex, q)
      } else {
        const nextTrack = q[nextIndex]
        set({ duration: nextTrack?.duration || 0, currentTime: 0 })
      }
    } else {
      const nextIndex = index < currentIndex ? currentIndex - 1 : currentIndex
      set({ queue: q, currentIndex: nextIndex })
      savePrefs({ queue: q, currentIndex: nextIndex })
    }
  },

  clearQueue: () => {
    const el = audioEngine.getAudioElement()
    el?.pause()
    set({ queue: [], currentIndex: -1, isPlaying: false, currentTime: 0, duration: 0, playbackError: null })
    savePrefs({ queue: [], currentIndex: -1 })
  },
}))

// Connect AudioEngine callbacks directly to Store
audioEngine.onTimeUpdate = (currentTime, duration) => {
  useStore.getState().setCurrentTime(currentTime)
  if (duration > 0) useStore.getState().setDuration(duration)
}
audioEngine.onPlayState = (isPlaying) => {
  useStore.getState().setPlaying(isPlaying)
}
audioEngine.onTrackEnded = () => {
  useStore.getState().next()
}
audioEngine.onBuffering = (isBuffering) => {
  useStore.getState().setBuffering(isBuffering)
}
audioEngine.onError = (msg) => {
  useStore.getState().setPlaybackError(msg)
}

