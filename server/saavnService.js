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

export async function searchFullSongs(query, limit = 40, offset = 0) {
  const p = Math.floor(offset / limit) + 1
  try {
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&q=${encodeURIComponent(
      query,
    )}&_format=json&_marker=0&ctx=web6dot0&p=${p}&n=${limit}`

    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    const results = json.results || []

    return results
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
  } catch (err) {
    console.error('Saavn search error:', err.message)
    return []
  }
}

