import { create } from 'zustand'
import type { MutableRefObject } from 'react'
import { audioEngine, type AudioAnalysis } from '@/audio/AudioEngine'

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
  toggleFavourite: (id: string) => void
  addToRecentlyPlayed: (id: string) => void
  // Playlists
  createPlaylist: (name: string) => Playlist
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addTrackToPlaylist: (playlistId: string, trackId: string) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  // Queue actions
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
}

const defaultSettings: VisualizerSettings = {
  bassSensitivity: 1.25,
  midSensitivity: 1.25,
  trebleSensitivity: 1.3,
  beatIntensity: 1.35,
  particleDensity: 1.1,
  deformation: 1.3,
  cameraMotion: 0.75,
  intensity: 1.2,
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

export const useStore = create<MusicState>((set, get) => ({
  tracks: [],
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isBuffering: false,
  playbackError: null,
  currentTime: 0,
  duration: 0,
  volume: prefs.volume ?? 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  playbackRate: 1,
  recentlyPlayed: prefs.recentlyPlayed ?? [],
  favourites: prefs.favourites ?? [],
  playlists: prefs.playlists ?? [
    { id: 'fav-vibes', name: 'Ambient Frequencies', trackIds: ['demo-1', 'demo-4'], createdAt: Date.now() - 86400000 },
  ],
  world: (prefs.world as WorldId) ?? 'space',
  settings: { ...defaultSettings, ...(prefs.settings ?? {}) },
  analysisRef: null,
  setAnalysisRef: (ref) => set({ analysisRef: ref }),

  setTracks: (t) => {
    // Merge without duplicates
    set((s) => {
      const map = new Map<string, Track>()
      s.tracks.forEach((x) => map.set(x.id, x))
      t.forEach((x) => map.set(x.id, x))
      return { tracks: Array.from(map.values()) }
    })
  },

  addTracks: (t) => set((s) => {
    const map = new Map<string, Track>()
    t.forEach((x) => map.set(x.id, x))
    s.tracks.forEach((x) => map.set(x.id, x))
    const merged = Array.from(map.values())
    return {
      tracks: merged,
      queue: s.queue.length ? s.queue : merged,
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

    let el = audioEngine.getAudioElement()
    if (!el) {
      el = await audioEngine.init()
    }
    await audioEngine.resume()

    if (el) {
      audioEngine.loadSource(track.src)
      el.playbackRate = get().playbackRate
      try {
        await el.play()
        set({ isBuffering: false, isPlaying: true, playbackError: null })
      } catch (err: unknown) {
        const error = err as Error
        console.warn('Playback error or blocked by autoplay:', error)
        // Check if CORS error occurred on crossOrigin = anonymous
        if (el.crossOrigin && (error.name === 'NotSupportedError' || el.error)) {
          // Retry without crossOrigin restriction as fallback audio playback
          el.removeAttribute('crossorigin')
          el.src = track.src
          el.load()
          el.play()
            .then(() => set({ isBuffering: false, isPlaying: true, playbackError: null }))
            .catch(() => set({ isBuffering: false, playbackError: 'Click Play button to activate sound.' }))
        } else {
          set({ isBuffering: false, playbackError: 'Click Play button to activate sound.' })
        }
      }
    }

    // Also store track into tracks library if not already present
    get().setTracks([track])
    get().addToRecentlyPlayed(track.id)
  },

  playTrackDirect: (track: Track) => {
    const { queue } = get()
    const idx = queue.findIndex((t) => t.id === track.id)
    if (idx >= 0) {
      get().playTrack(idx)
    } else {
      const nextQueue = [track, ...queue]
      set({ queue: nextQueue })
      get().playTrack(0, nextQueue)
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
    audioEngine.setVolume(vol)
    set({ volume: vol, muted: vol === 0 })
    savePrefs({ volume: vol })
  },

  toggleMute: () => {
    const { muted, volume } = get()
    if (muted) {
      audioEngine.setVolume(volume || 0.8)
      set({ muted: false })
    } else {
      audioEngine.setVolume(0)
      set({ muted: true })
    }
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
  toggleFavourite: (id) => {
    set((s) => {
      const fav = s.favourites.includes(id) ? s.favourites.filter((x) => x !== id) : [...s.favourites, id]
      savePrefs({ favourites: fav })
      return { favourites: fav }
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
  createPlaylist: (name: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: name.trim() || 'Untitled Playlist',
      trackIds: [],
      createdAt: Date.now(),
    }
    set((s) => {
      const next = [newPl, ...s.playlists]
      savePrefs({ playlists: next })
      return { playlists: next }
    })
    return newPl
  },

  renamePlaylist: (id, name) => {
    set((s) => {
      const next = s.playlists.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p))
      savePrefs({ playlists: next })
      return { playlists: next }
    })
  },

  deletePlaylist: (id) => {
    set((s) => {
      const next = s.playlists.filter((p) => p.id !== id)
      savePrefs({ playlists: next })
      return { playlists: next }
    })
  },

  addTrackToPlaylist: (playlistId, trackId) => {
    set((s) => {
      const next = s.playlists.map((p) => {
        if (p.id !== playlistId) return p
        if (p.trackIds.includes(trackId)) return p
        return { ...p, trackIds: [...p.trackIds, trackId] }
      })
      savePrefs({ playlists: next })
      return { playlists: next }
    })
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    set((s) => {
      const next = s.playlists.map((p) => {
        if (p.id !== playlistId) return p
        return { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) }
      })
      savePrefs({ playlists: next })
      return { playlists: next }
    })
  },

  // Queue actions
  addToQueue: (track) => {
    set((s) => ({ queue: [...s.queue, track] }))
  },

  removeFromQueue: (index) => {
    set((s) => {
      const q = s.queue.filter((_, i) => i !== index)
      let nextIndex = s.currentIndex
      if (index < s.currentIndex) nextIndex--
      else if (index === s.currentIndex) {
        if (nextIndex >= q.length) nextIndex = q.length - 1
      }
      return { queue: q, currentIndex: nextIndex }
    })
  },

  clearQueue: () => set({ queue: [], currentIndex: -1, isPlaying: false }),
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

