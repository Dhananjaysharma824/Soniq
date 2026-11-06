import { API_BASE_URL } from './apiConfig'

// Unified Music API service — integrates Meld architecture + Jamendo with seamless client fallback
const API_BASE = API_BASE_URL ? `${API_BASE_URL}/api/music` : '/api/music'

export interface JamendoTrack {
  id: string
  name: string
  artist_name: string
  album_name: string
  album_image: string
  duration: number
  audio: string
  audiodownload: string
  image: string
  shareurl?: string
  genre?: string
  license_ccurl?: string
}

export interface JamendoAlbum {
  id: string
  name: string
  artist_name: string
  image: string
  releasedate: string
  tracks?: JamendoTrack[]
}

export interface JamendoArtist {
  id: string
  name: string
  image: string
  website: string
  joindate: string
}

interface JamendoResponse<T> {
  headers: { status: string; code: number; results_count: number }
  results: T[]
}

async function apiFetch<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T | null> {
  // 1. Try Express backend proxy
  try {
    const url = new URL(`${API_BASE}${path}`, window.location.origin)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
    const response = await fetch(url.toString())
    if (response.ok) {
      const data = await response.json()
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data
      }
    }
  } catch {
    // Backend offline / proxy error -> fall back to Meld universal client search
  }

  // 2. Client-side fallback via Meld open metadata provider (allows searching any Bollywood / Global song)
  if (path === '/search' || path === '/popular') {
    try {
      const rawTerm = String(params.q || (path === '/popular' ? 'Bollywood Top Hits' : ''))
      const term = rawTerm.replace(/\s+by\s+/gi, ' ').trim()
      if (term) {
        const offsetParam = params.offset && Number(params.offset) > 0 ? `&offset=${params.offset}` : ''
        const directUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&country=IN&limit=${params.limit || 40}${offsetParam}`
        const res = await fetch(directUrl)
        if (res.ok) {
          const json = await res.json()
          const mapped: JamendoTrack[] = (json.results || []).map((r: {
            trackId: number
            trackName: string
            artistName: string
            collectionName: string
            artworkUrl100: string
            trackTimeMillis: number
            previewUrl: string
            primaryGenreName: string
          }) => ({
            id: `itunes-${r.trackId}`,
            name: r.trackName,
            artist_name: r.artistName,
            album_name: r.collectionName,
            album_image: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
            image: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
            duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 180,
            audio: r.previewUrl,
            audiodownload: r.previewUrl,
            genre: r.primaryGenreName,
          }))
          return {
            headers: { status: 'success', code: 0, results_count: mapped.length },
            results: mapped,
          } as unknown as T
        }
      }
    } catch (e) {
      console.warn('Meld direct search fallback notice:', e)
    }
  }

  return null
}

/**
 * Search tracks by query string (Bollywood, Indian, International)
 */
export async function searchTracks(query: string, limit = 40, offset = 0): Promise<JamendoTrack[]> {
  const data = await apiFetch<JamendoResponse<JamendoTrack>>('/search', { q: query, limit, offset })
  return data?.results ?? []
}

/**
 * Get popular/trending tracks
 */
export async function getPopularTracks(limit = 40, offset = 0): Promise<JamendoTrack[]> {
  const data = await apiFetch<JamendoResponse<JamendoTrack>>('/popular', { limit, offset })
  return data?.results ?? []
}

/**
 * Get a single track by ID
 */
export async function getTrack(id: string): Promise<JamendoTrack | null> {
  const data = await apiFetch<JamendoResponse<JamendoTrack>>(`/track/${id}`)
  return data?.results?.[0] ?? null
}

/**
 * Get available genre tags
 */
export async function getGenres(): Promise<string[]> {
  const data = await apiFetch<{ results: string[] }>('/genres')
  return (
    data?.results ?? [
      'bollywood',
      'indian classical',
      'sufi',
      'punjabi',
      'electronic',
      'ambient',
      'synthwave',
      'techno',
      'lofi',
    ]
  )
}

/**
 * Get album details by ID
 */
export async function getAlbum(id: string): Promise<JamendoAlbum | null> {
  const data = await apiFetch<JamendoResponse<JamendoAlbum>>(`/albums/${id}`)
  return data?.results?.[0] ?? null
}

/**
 * Get artist details by ID
 */
export async function getArtist(id: string): Promise<JamendoArtist | null> {
  const data = await apiFetch<JamendoResponse<JamendoArtist>>(`/artist/${id}`)
  return data?.results?.[0] ?? null
}
