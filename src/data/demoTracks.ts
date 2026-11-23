import type { Track } from '@/store/useStore'

function art(seed: string, c1: string, c2: string, subtitle = 'SONIQ'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.08"/></feComponentTransfer>
      <feBlend in="SourceGraphic" mode="overlay"/>
    </filter>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="200" cy="200" r="120" fill="none" stroke="rgba(243,241,236,0.14)" stroke-width="1.5"/>
  <circle cx="200" cy="200" r="70" fill="none" stroke="rgba(197,168,117,0.35)" stroke-width="1.5"/>
  <polygon points="190,175 225,200 190,225" fill="#C5A875" opacity="0.9"/>
  <text x="200" y="268" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="15" fill="rgba(243,241,236,0.9)" letter-spacing="4">${seed}</text>
  <text x="200" y="290" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="500" font-size="11" fill="rgba(197,168,117,0.8)" letter-spacing="3">${subtitle}</text>
  <rect width="400" height="400" filter="url(#n)" opacity="0.45"/>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const BOLLYWOOD_BASE = 'https://raw.githubusercontent.com/wikivky/musicplayer/master/'

export const demoTracks: Track[] = [
  // ─── SEEDHE MAUT & DHH (DESI HIP-HOP) ───
  {
    id: 'track-sm-lunch-break',
    title: 'Lunch Break',
    artist: 'Seedhe Maut',
    album: 'Lunch Break',
    duration: 189,
    genre: 'Desi Hip-Hop',
    src: 'https://aac.saavncdn.com/745/3457336d127f1b1b787ddf786c41e72a_320.mp4',
    artwork: 'https://c.saavncdn.com/745/Lunch-Break-Hindi-2023-20250315143227-500x500.jpg',
  },
  {
    id: 'track-sm-khatta-flow',
    title: 'Khatta Flow',
    artist: 'Seedhe Maut, KR$NA',
    album: 'Lunch Break',
    duration: 167,
    genre: 'Desi Hip-Hop',
    src: 'https://aac.saavncdn.com/745/c94ca04994e21ebea834d8fbbc25a421_320.mp4',
    artwork: 'https://c.saavncdn.com/745/Lunch-Break-Hindi-2023-20250315143227-500x500.jpg',
  },
  {
    id: 'track-sm-11k',
    title: '11K',
    artist: 'Seedhe Maut',
    album: 'Lunch Break',
    duration: 174,
    genre: 'Desi Hip-Hop',
    src: 'https://aac.saavncdn.com/745/6575d91fd53cb9e22968134009ff70a4_320.mp4',
    artwork: 'https://c.saavncdn.com/745/Lunch-Break-Hindi-2023-20250315143227-500x500.jpg',
  },
  {
    id: 'track-sm-swah',
    title: 'Swah!',
    artist: 'Seedhe Maut, Badshah',
    album: 'Lunch Break',
    duration: 160,
    genre: 'Desi Hip-Hop',
    src: 'https://aac.saavncdn.com/745/c8a633c06a5789252871abb76838ddcf_320.mp4',
    artwork: 'https://c.saavncdn.com/745/Lunch-Break-Hindi-2023-20250315143227-500x500.jpg',
  },

  // ─── ATIF ASLAM CLASSICS ───
  {
    id: 'track-atif-pehli-nazar-mein',
    title: 'Pehli Nazar Mein',
    artist: 'Atif Aslam & Pritam',
    album: 'Race',
    duration: 314,
    genre: 'Bollywood',
    src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0d/db/cf/0ddbcf31-22d7-088e-c71f-1dd88a3dd8a2/mzaf_16563349538675654632.plus.aac.p.m4a',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/38/44/21/384421ca-69a0-83f2-0a34-88653d45db97/8901854001385.jpg/600x600bb.jpg',
  },
  {
    id: 'track-atif-tu-jaane-na',
    title: 'Tu Jaane Na',
    artist: 'Atif Aslam & Pritam',
    album: 'Ajab Prem Ki Ghazab Kahani',
    duration: 338,
    genre: 'Bollywood',
    src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a9/06/7e/a9067efd-0925-6087-71bd-11155c2d3289/mzaf_15735148284263193215.plus.aac.p.m4a',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/43/fb/d8/43fbd870-9a3b-ccd9-8866-2a2c6dc48287/8901854003792.jpg/600x600bb.jpg',
  },
  {
    id: 'track-atif-jeene-laga-hoon',
    title: 'Jeene Laga Hoon',
    artist: 'Atif Aslam, Shreya Ghoshal & Sachin-Jigar',
    album: 'Ramaiya Vastavaiya',
    duration: 236,
    genre: 'Bollywood',
    src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/6c/42/27/6c42274a-832c-9c1b-b955-5328aa0e91b6/mzaf_14885254077776408990.plus.aac.p.m4a',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/0c/f4/ac/0cf4acd9-9510-3c12-b453-50021a4985ec/8901854027637.jpg/600x600bb.jpg',
  },
  {
    id: 'track-atif-woh-lamhe',
    title: 'Woh Lamhe Woh Baatein',
    artist: 'Atif Aslam & Mithoon',
    album: 'Zeher',
    duration: 320,
    genre: 'Bollywood',
    src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c5/ca/a3/c5caa321-497e-84f9-6c69-1ac257f518df/mzaf_7054101797817312922.plus.aac.p.m4a',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/9d/4e/5a/9d4e5a11-1eb8-ae96-eb4b-cf01c89f583c/0602465590869.jpg/600x600bb.jpg',
  },
  {
    id: 'track-atif-aadat',
    title: 'Aadat',
    artist: 'Jal & Atif Aslam',
    album: 'Kalyug',
    duration: 275,
    genre: 'Bollywood',
    src: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f1/f8/67/f1f86771-97d0-91a3-f619-659586af410c/mzaf_8775280278482094900.plus.aac.p.m4a',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/27/41/48/27414810-2929-aa34-e145-000948a5c8b7/0602465586596.jpg/600x600bb.jpg',
  },

  // ─── BOLLYWOOD & INDIAN HITS ───
  {
    id: 'track-aankhein-navjot-ahuja',
    title: 'Aankhein',
    artist: 'Navjot Ahuja',
    album: 'Aankhein',
    duration: 315,
    genre: 'Hindi Indie',
    src: 'https://aac.saavncdn.com/663/77b8e7af19aa6db2d648793d496465e1_320.mp4',
    artwork: 'https://c.saavncdn.com/663/Aankhein-Hindi-2026-20260915183240-500x500.jpg',
  },
  {
    id: 'track-kal-ho-na-ho',
    title: 'Kal Ho Naa Ho',
    artist: 'Sonu Nigam (Shankar-Ehsaan-Loy)',
    album: 'Kal Ho Naa Ho',
    duration: 321,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}f.mp3`,
    artwork: 'https://upload.wikimedia.org/wikipedia/en/4/45/Kal_Ho_Naa_Ho.jpg',
  },
  {
    id: 'track-kaun-tujhe',
    title: 'Kaun Tujhe Yun Pyaar Karega',
    artist: 'Palak Muchhal (Amaal Mallik)',
    album: 'M.S. Dhoni: The Untold Story',
    duration: 241,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}b.mp3`,
    artwork: art('KAUN TUJHE', '#1a1012', '#3a1a24', 'BOLLYWOOD'),
  },
  {
    id: 'track-tere-bina',
    title: 'Tere Bina Zindagi Se Koi',
    artist: 'SANAM (R.D. Burman Tribute)',
    album: 'SANAM Classic Revivals',
    duration: 236,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}a.mp3`,
    artwork: art('TERE BINA', '#12141c', '#202436', 'BOLLYWOOD'),
  },
  {
    id: 'track-hasi-ban-gaye',
    title: 'Haan Hasi Ban Gaye',
    artist: 'Shreya Ghoshal (Hamari Adhuri Kahani)',
    album: 'Hamari Adhuri Kahani',
    duration: 212,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}d.mp3`,
    artwork: art('HASI BAN GAYE', '#181216', '#34202e', 'BOLLYWOOD'),
  },
  {
    id: 'track-salamat',
    title: 'Salamat Rahe Dilbar Mera',
    artist: 'Arijit Singh & Tulsi Kumar',
    album: 'Sarbjit',
    duration: 270,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}e.mp3`,
    artwork: art('SALAMAT', '#181410', '#36281c', 'BOLLYWOOD'),
  },
  {
    id: 'track-suit-suit',
    title: 'Suit Suit Karda',
    artist: 'Guru Randhawa & Arjun',
    album: 'Hindi Medium',
    duration: 190,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}h.mp3`,
    artwork: art('SUIT SUIT', '#1c160e', '#3c2e18', 'PUNJABI BEATS'),
  },
  {
    id: 'track-jitni-dafa',
    title: 'Jitni Dafa Dekhun Tumhe',
    artist: 'Yasser Desai & Jeet Gannguli',
    album: 'Parmanu',
    duration: 218,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}c.mp3`,
    artwork: art('JITNI DAFA', '#101418', '#1c2834', 'BOLLYWOOD'),
  },
  {
    id: 'track-aap-ki-nazron',
    title: 'Aap Ki Nazron Ne Samjha',
    artist: 'SANAM feat. Sanah Moidutty',
    album: 'SANAM Renditions',
    duration: 220,
    genre: 'Bollywood',
    src: `${BOLLYWOOD_BASE}i.mp3`,
    artwork: art('AAP KI NAZRON', '#16141a', '#2c2238', 'BOLLYWOOD'),
  },
  {
    id: 'track-zindagi-kaisi',
    title: 'Zindagi Kaisi Hai Paheli',
    artist: 'Manna Dey (Salil Chowdhury)',
    album: 'Anand',
    duration: 216,
    genre: 'Indian Classic',
    src: `${BOLLYWOOD_BASE}j.mp3`,
    artwork: art('ANAND', '#141812', '#223220', 'CLASSIC HINDI'),
  },

  // ─── INDIAN CLASSICAL & SITAR FUSION ───
  {
    id: 'track-sitar-tabla-jam',
    title: 'Sitar & Tabla Raga Resonance',
    artist: 'Freedom Jam Classical Ensemble',
    album: 'Sacred Strings of India',
    duration: 295,
    genre: 'Indian Classical',
    src: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Sitar_and_tabla_rendition_-_Freedom_Jam%2C_2015.oga',
    artwork: art('SITAR TABLA', '#1e140c', '#3c2414', 'RAGA FUSION'),
  },

  // ─── ELECTRONIC, SYNTHWAVE & AMBIENT ───
  {
    id: 'track-80s-vibe',
    title: '80s Synthwave Vibe',
    artist: 'Goldfire & Holler',
    album: 'Neon Horizon',
    duration: 198,
    genre: 'Synthwave',
    src: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/80s_vibe.mp3',
    artwork: art('80S VIBE', '#14121c', '#2c1e38', 'SYNTHWAVE'),
  },
  {
    id: 'track-rave-digger',
    title: 'Rave Digger',
    artist: 'Modulation Unit',
    album: 'Frequency Shift',
    duration: 215,
    genre: 'Electronic',
    src: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/rave_digger.mp3',
    artwork: art('RAVE', '#0e1820', '#1c2e3a', 'ELECTRONIC'),
  },
  {
    id: 'track-running-out',
    title: 'Running Out of Time',
    artist: 'Glass Archive',
    album: 'Dream State',
    duration: 242,
    genre: 'Ambient',
    src: 'https://raw.githubusercontent.com/goldfire/howler.js/master/examples/player/audio/running_out.mp3',
    artwork: art('DEPTH', '#181214', '#342024', 'AMBIENT'),
  },
  {
    id: 'track-viper-flow',
    title: 'Viper Flow Resonance',
    artist: 'MDN Sound Lab',
    album: 'Audio Synthesis',
    duration: 180,
    genre: 'Techno',
    src: 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3',
    artwork: art('VIPER', '#0b1614', '#163028', 'TECHNO'),
  },
]
