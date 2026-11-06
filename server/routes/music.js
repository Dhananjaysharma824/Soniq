import { Router } from 'express'

const router = Router()
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0'

function getClientId() {
  return process.env.JAMENDO_CLIENT_ID
}

// Fallback search using Meld universal music metadata engine
async function meldSearch(query, limit = 50, offset = 0) {
  try {
    const url = new URL('https://itunes.apple.com/search')
    url.searchParams.set('term', query)
    url.searchParams.set('entity', 'song')
    url.searchParams.set('limit', String(Math.min(limit, 200)))
    if (offset > 0) {
      url.searchParams.set('offset', String(offset))
    }

    const response = await fetch(url.toString())
    if (!response.ok) return []
    const json = await response.json()

    return (json.results || []).map((r) => ({
      id: `itunes-${r.trackId}`,
      name: r.trackName,
      artist_name: r.artistName,
      album_name: r.collectionName || r.trackName,
      album_image: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      image: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 180,
      audio: r.previewUrl,
      audiodownload: r.previewUrl,
      shareurl: r.trackViewUrl,
      genre: r.primaryGenreName,
      license_ccurl: '',
    }))
  } catch (err) {
    console.error('Meld search error:', err.message)
    return []
  }
}

async function jamendoFetch(endpoint, params = {}) {
  const clientId = getClientId()
  const url = new URL(`${JAMENDO_BASE}/${endpoint}/`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Jamendo API error ${response.status}: ${text}`)
  }
  return response.json()
}

// GET /api/music/search?q=...&limit=...&offset=...
router.get('/search', async (req, res) => {
  const { q, limit = 24, offset = 0 } = req.query
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' })

  // 1. Try Jamendo if client ID is configured
  if (getClientId()) {
    try {
      const data = await jamendoFetch('tracks', {
        search: q,
        limit,
        offset,
        include: 'musicinfo',
        imagesize: 600,
      })
      if (data && data.results && data.results.length > 0) {
        return res.json(data)
      }
    } catch (err) {
      console.warn('Jamendo query failed, falling back to Meld search:', err.message)
    }
  }

  // 2. Fall back to Meld universal search engine (instant access to Bollywood, Indian, and Global music)
  try {
    const meldResults = await meldSearch(q, Number(limit) || 50, Number(offset) || 0)
    res.json({
      headers: { status: 'success', code: 0, results_count: meldResults.length },
      results: meldResults,
    })
  } catch (err) {
    console.error('Music search error:', err.message)
    res.status(500).json({ error: 'Failed to search tracks' })
  }
})

// GET /api/music/popular?limit=...&offset=...&order=...
router.get('/popular', async (req, res) => {
  const { limit = 50, offset = 0, order = 'popularity_total' } = req.query

  // 1. Try Jamendo if client ID configured
  if (getClientId()) {
    try {
      const data = await jamendoFetch('tracks', {
        limit,
        offset,
        order,
        include: 'musicinfo',
        imagesize: 600,
      })
      if (data && data.results && data.results.length > 0) {
        return res.json(data)
      }
    } catch (err) {
      console.warn('Jamendo popular failed, falling back to Meld trending:', err.message)
    }
  }

  // 2. Fall back to Trending Bollywood & Global charts
  try {
    const trendingQueries = ['Bollywood top hits', 'Arijit Singh', 'Pritam', 'Trending Indian Music']
    const pick = trendingQueries[Math.floor(Math.random() * trendingQueries.length)]
    const results = await meldSearch(pick, Number(limit) || 50, Number(offset) || 0)
    res.json({
      headers: { status: 'success', code: 0, results_count: results.length },
      results,
    })
  } catch (err) {
    console.error('Popular tracks error:', err.message)
    res.status(500).json({ error: 'Failed to fetch popular tracks' })
  }
})

// GET /api/music/track/:id
router.get('/track/:id', async (req, res) => {
  const id = req.params.id
  if (id.startsWith('itunes-')) {
    const itunesId = id.replace('itunes-', '')
    try {
      const url = `https://itunes.apple.com/lookup?id=${itunesId}`
      const response = await fetch(url)
      const json = await response.json()
      const r = json.results?.[0]
      if (r) {
        return res.json({
          headers: { status: 'success', code: 0, results_count: 1 },
          results: [
            {
              id,
              name: r.trackName,
              artist_name: r.artistName,
              album_name: r.collectionName,
              album_image: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
              duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 180,
              audio: r.previewUrl,
            },
          ],
        })
      }
    } catch (err) {
      console.error('Lookup track error:', err.message)
    }
  }

  if (!getClientId()) {
    return res.status(404).json({ error: 'Track not found' })
  }

  try {
    const data = await jamendoFetch('tracks', {
      id,
      include: 'musicinfo+licenses',
      imagesize: 600,
    })
    res.json(data)
  } catch (err) {
    console.error('Get track error:', err.message)
    res.status(500).json({ error: 'Failed to fetch track' })
  }
})

// GET /api/music/genres
router.get('/genres', async (_req, res) => {
  const genres = [
    'bollywood',
    'indian classical',
    'sufi',
    'punjabi',
    'electronic',
    'ambient',
    'techno',
    'synthwave',
    'lofi',
    'acoustic',
    'pop',
    'rock',
    'chillout',
  ]
  res.json({ headers: { status: 'success' }, results: genres })
})

export default router
