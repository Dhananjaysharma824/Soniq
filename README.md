# SONIQ

**Don't Just Hear It. Feel It.**

SONIQ is an immersive 3D music experience platform where real-time audio analysis (bass, mids, treble, waveform, beats) drives the entire visual environment.

## Stack
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Framer Motion
- **3D:** Three.js, React Three Fiber, Drei, custom GLSL displacement shaders, GPU-instanced particles, post-processing (Bloom, Chromatic Aberration, Noise, Vignette)
- **Audio:** Web Audio API (`AudioContext`, `AnalyserNode`, FFT + time-domain), adaptive beat detection
- **Backend:** Node.js, Express, MongoDB, JWT (functional demo fallback when unconfigured)

## Quick start (frontend)
```bash
npm install
npm run dev
```
Open the local URL (default `http://localhost:5173`).

## Backend (optional)
```bash
cp .env.example .env   # set MONGODB_URI and JWT_SECRET
npm run server
```
The UI works fully without the backend (guest mode, local preferences, audio upload). The API provides persistent auth, playlists, favourites and preferences when MongoDB is configured.

## Features
- Real FFT frequency analysis and adaptive beat/transient detection (no simulated randomness)
- Audio-reactive liquid-metal sculpture (custom vertex displacement), particle systems, and 4 worlds: **Space, Ocean, Dream, Tunnel**
- Music keeps playing across world switches
- Functional player: play/pause, prev/next, seek, volume, mute, shuffle, repeat, playback rate state, queue
- Upload your own audio (MP3/WAV/OGG) — analyzed locally in the browser
- Discover, Worlds, Library, Profile pages with local/demo fallbacks
- Visualizer settings (sensitivity, density, deformation, camera motion, quality, reduced motion)
- Keyboard shortcuts: Space play/pause, ←/→ seek, ↑/↓ volume, M mute, N next, P previous, S shuffle, R repeat

## Notes
- Demo tracks use CORS-friendly public samples; if a remote sample is unavailable, use **Upload** in the player.
- User audio uploads are not sent to the backend by default.
- WebGL2 is required for the 3D experience; quality adapts via settings.
