import { useStore, type Playlist, type Track } from '@/store/useStore'
import { API_BASE_URL } from './apiConfig'

function getToken(): string | null {
  try {
    return localStorage.getItem('soniq-token')
  } catch {
    return null
  }
}

export async function syncUserData(): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    // 1. Fetch user preferences & favourites
    const prefRes = await fetch(`${API_BASE_URL}/api/profile/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (prefRes.ok) {
      const data = await prefRes.json()
      if (Array.isArray(data.favourites)) {
        const store = useStore.getState()
        // Merge with existing local favourites
        const mergedFavs = Array.from(new Set([...store.favourites, ...data.favourites]))
        useStore.setState({ favourites: mergedFavs })
      }
      if (Array.isArray(data.recentlyPlayed)) {
        const store = useStore.getState()
        const mergedRecent = Array.from(new Set([...store.recentlyPlayed, ...data.recentlyPlayed])).slice(0, 50)
        useStore.setState({ recentlyPlayed: mergedRecent })
      }
    }

    // 2. Fetch playlists
    const plRes = await fetch(`${API_BASE_URL}/api/playlists`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (plRes.ok) {
      const data = await plRes.json()
      const serverPlaylists: Array<{
        _id?: string
        id?: string
        name: string
        description?: string
        tracks?: Track[]
        trackIds?: string[]
        createdAt?: string
      }> = data.playlists || []

      if (serverPlaylists.length > 0) {
        const store = useStore.getState()
        const localMap = new Map<string, Playlist>()
        store.playlists.forEach((p) => localMap.set(p.id, p))

        const hydratedTracks: Track[] = []

        serverPlaylists.forEach((sp) => {
          const id = sp._id || sp.id || `pl-${Date.now()}`
          const trackIds = sp.trackIds || (sp.tracks ? sp.tracks.map((t) => t.id) : [])
          if (sp.tracks && Array.isArray(sp.tracks)) {
            sp.tracks.forEach((t) => hydratedTracks.push(t))
          }
          localMap.set(id, {
            id,
            name: sp.name,
            trackIds,
            createdAt: sp.createdAt ? new Date(sp.createdAt).getTime() : Date.now(),
          })
        })

        if (hydratedTracks.length > 0) {
          store.addTracks(hydratedTracks)
        }

        useStore.setState({ playlists: Array.from(localMap.values()) })
      }
    }
  } catch (err) {
    console.warn('Backend sync failed, using local storage cache:', err)
  }
}

export async function apiCreatePlaylist(name: string, description = '', tracks: Track[] = []): Promise<string | null> {
  const token = getToken()
  if (!token) return null

  try {
    const res = await fetch(`${API_BASE_URL}/api/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, description, tracks }),
    })
    if (res.ok) {
      const data = await res.json()
      return data.playlist?._id || data.playlist?.id || null
    }
  } catch (err) {
    console.warn('API create playlist failed:', err)
  }
  return null
}

export async function apiUpdatePlaylist(id: string, updates: { name?: string; description?: string; tracks?: Track[] }): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    await fetch(`${API_BASE_URL}/api/playlists/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })
  } catch (err) {
    console.warn('API update playlist failed:', err)
  }
}

export async function apiDeletePlaylist(id: string): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    await fetch(`${API_BASE_URL}/api/playlists/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (err) {
    console.warn('API delete playlist failed:', err)
  }
}

export async function apiToggleFavourite(trackId: string): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    await fetch(`${API_BASE_URL}/api/profile/favourites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ trackId }),
    })
  } catch (err) {
    console.warn('API toggle favourite failed:', err)
  }
}

