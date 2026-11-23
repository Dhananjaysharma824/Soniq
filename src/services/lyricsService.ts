export interface LyricLine {
  time: number
  text: string
}

export interface LyricsData {
  synced: boolean
  lines: LyricLine[]
  plainText?: string
  source?: string
}

function cleanSongTitle(title: string): string {
  return (title || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ft\..*$/i, '')
    .replace(/feat\..*$/i, '')
    .trim()
}

function cleanArtistName(artist: string): string {
  return (artist || '')
    .split(',')[0]
    .split('&')[0]
    .split('feat.')[0]
    .trim()
}

export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText) return []
  const lines: LyricLine[] = []
  const rawLines = lrcText.split('\n')

  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g

  for (const raw of rawLines) {
    const text = raw.replace(timeRegex, '').trim()
    if (!text) continue

    let match: RegExpExecArray | null
    timeRegex.lastIndex = 0
    while ((match = timeRegex.exec(raw)) !== null) {
      const min = parseInt(match[1], 10)
      const sec = parseFloat(match[2])
      const totalSec = min * 60 + sec
      lines.push({ time: totalSec, text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

const lyricsCache = new Map<string, LyricsData | null>()

export async function fetchLyrics(title: string, artist: string, duration?: number): Promise<LyricsData | null> {
  const cacheKey = `${title.toLowerCase()}___${artist.toLowerCase()}`
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey) || null
  }

  const cleanTitle = cleanSongTitle(title)
  const cleanArtist = cleanArtistName(artist)

  // 1. Try direct exact match on LRCLIB
  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    })
    if (duration && duration > 0) {
      params.set('duration', String(Math.round(duration)))
    }

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: {
        'Lrclib-Client': 'SONIQ Music Web Player (https://github.com/Dhananjaysharma824/Soniq)',
      },
    })

    if (res.ok) {
      const data = await res.json()
      if (data.syncedLyrics) {
        const parsed: LyricsData = {
          synced: true,
          lines: parseLrc(data.syncedLyrics),
          source: 'LRCLIB Synced',
        }
        lyricsCache.set(cacheKey, parsed)
        return parsed
      }
      if (data.plainLyrics) {
        const parsed: LyricsData = {
          synced: false,
          lines: data.plainLyrics.split('\n').filter((l: string) => l.trim()).map((text: string) => ({ time: -1, text })),
          plainText: data.plainLyrics,
          source: 'LRCLIB Plain',
        }
        lyricsCache.set(cacheKey, parsed)
        return parsed
      }
    }
  } catch (err) {
    console.warn('LRCLIB exact fetch failed, trying search fallback:', err)
  }

  // 2. Try search fallback on LRCLIB
  try {
    const q = `${cleanTitle} ${cleanArtist}`.trim()
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
      headers: {
        'Lrclib-Client': 'SONIQ Music Web Player (https://github.com/Dhananjaysharma824/Soniq)',
      },
    })

    if (res.ok) {
      const results = await res.json()
      if (Array.isArray(results) && results.length > 0) {
        const firstWithSynced = results.find((r) => r.syncedLyrics) || results[0]
        if (firstWithSynced.syncedLyrics) {
          const parsed: LyricsData = {
            synced: true,
            lines: parseLrc(firstWithSynced.syncedLyrics),
            source: 'LRCLIB Search',
          }
          lyricsCache.set(cacheKey, parsed)
          return parsed
        }
        if (firstWithSynced.plainLyrics) {
          const parsed: LyricsData = {
            synced: false,
            lines: firstWithSynced.plainLyrics.split('\n').filter((l: string) => l.trim()).map((text: string) => ({ time: -1, text })),
            plainText: firstWithSynced.plainLyrics,
            source: 'LRCLIB Search Plain',
          }
          lyricsCache.set(cacheKey, parsed)
          return parsed
        }
      }
    }
  } catch (err) {
    console.warn('LRCLIB search fallback failed:', err)
  }

  lyricsCache.set(cacheKey, null)
  return null
}
