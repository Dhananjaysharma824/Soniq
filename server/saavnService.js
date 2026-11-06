import CryptoJS from 'crypto-js'

export function decryptSaavnUrl(enc) {
  if (!enc) return ''
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591')
    const ciphertext = CryptoJS.enc.Base64.parse(enc)
    const decrypted = CryptoJS.DES.decrypt({ ciphertext }, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })
    const raw = decrypted.toString(CryptoJS.enc.Utf8)
    if (!raw) return ''
    // Upgrade 96kbps to 320kbps full high quality stream
    return raw.replace('_96.mp4', '_320.mp4')
  } catch {
    return ''
  }
}

function cleanHtml(str) {
  if (!str) return ''
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  Referer: 'https://www.jiosaavn.com/',
}

export async function searchFullSongs(query, limit = 40, offset = 0) {
  if (!query || !query.trim()) return []
  const cleanQ = query.trim()
  const p = Math.floor(offset / limit) + 1

  // Generate candidate queries (e.g. "aankhein by navjot ahuja" or "aankhein bt navjot ahuja" -> also try "aankhein navjot ahuja")
  const queriesToTry = [cleanQ]
  if (/\s+(by|bt)\s+/i.test(cleanQ)) {
    queriesToTry.push(cleanQ.replace(/\s+(by|bt)\s+/gi, ' ').replace(/\s+/g, ' ').trim())
  }

  for (const q of queriesToTry) {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
        q,
      )}&_format=json&_marker=0&ctx=web6dot0&p=${p}&n=${limit}`

      const res = await fetch(url, { headers: BROWSER_HEADERS })
      if (!res.ok) continue
      const json = await res.json()
      const results = json.results || []

      if (results.length > 0) {
        const mapped = results
          .map((r) => {
            const audioUrl = decryptSaavnUrl(r.encrypted_media_url) || r.media_preview_url
            if (!audioUrl) return null

            const title = cleanHtml(r.song || r.title || '')
            const artist = cleanHtml(r.singers || r.primary_artists || '')
            const album = cleanHtml(r.album || title)
            const artwork = (r.image || '').replace('150x150', '500x500')

            return {
              id: `saavn-${r.id}`,
              name: title,
              artist_name: artist,
              album_name: album,
              album_image: artwork,
              image: artwork,
              duration: Number(r.duration) || 240,
              audio: audioUrl,
              audiodownload: audioUrl,
              shareurl: r.perma_url || '',
              genre: r.language || 'Bollywood',
              license_ccurl: '',
            }
          })
          .filter(Boolean)

        if (mapped.length > 0) {
          return mapped
        }
      }
    } catch (err) {
      console.warn(`Saavn query [${q}] error:`, err.message)
    }
  }

  return []
}

