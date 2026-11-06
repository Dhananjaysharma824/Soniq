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
  // ─── BOLLYWOOD & INDIAN HITS ───
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
