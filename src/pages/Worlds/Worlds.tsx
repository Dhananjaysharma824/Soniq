import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import MusicPlayer from '@/components/MusicPlayer/MusicPlayer'
import { useStore, type WorldId } from '@/store/useStore'

const worlds: { id: WorldId; name: string; desc: string; detail: string; gradient: string }[] = [
  {
    id: 'space',
    name: 'Space',
    desc: 'Deep universe, floating celestial bodies, orbital rings and cosmic starfields.',
    detail: 'Sub-bass frequencies expand planetary geometry. Rhythmic transients pulse orbital rings with champagne emission. High frequencies vibrate the starfield density.',
    gradient: 'from-[#070c18] via-[#0d162a] to-[#16233c]',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    desc: 'Fluid surfaces, wave deformations and deep marine light refraction.',
    detail: 'Bass drives oceanic swells. Midrange audio triggers turbulent fluid distortions across 80x80 vertex planes. Highs lift bubbles toward the surface.',
    gradient: 'from-[#021018] via-[#052230] to-[#0a384e]',
  },
  {
    id: 'dream',
    name: 'Dream',
    desc: 'Translucent glass sculptures, surreal refraction and ethereal atmospheres.',
    detail: 'Physical transmission glass materials with real-time IOR refraction. Bass alters structural scale. Mid frequencies twist organic knots. Beats pulse inner radiance.',
    gradient: 'from-[#0c0818] via-[#180f2b] to-[#2c1c46]',
  },
  {
    id: 'tunnel',
    name: 'Tunnel',
    desc: 'Architectural geometric corridor pulsing through perspective depth.',
    detail: 'High-speed camera motion with perspective compression. Bass notes expand concentric structural portals. Beats trigger synchronized light waves down the z-axis.',
    gradient: 'from-[#08090c] via-[#111318] to-[#1c1f26]',
  },
]

export default function Worlds() {
  const setWorld = useStore((s) => s.setWorld)
  const current = useStore((s) => s.world)

  return (
    <div className="min-h-screen bg-bg-primary pb-32">
      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-champagne">
            Environments
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl text-text-primary">
            Choose Your Dimension
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Each world possesses its own physical shader materials, camera trajectories, and real-time audio-reactive mappings.
            Switching dimensions maintains uninterrupted continuous audio playback.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {worlds.map((w, i) => {
            const isActive = current === w.id
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-8 transition-all duration-300 bg-gradient-to-br ${w.gradient} ${
                  isActive ? 'border-champagne/40 shadow-xl' : 'border-white/[0.06] hover:border-white/[0.15]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display text-2xl font-semibold tracking-tight text-text-primary">
                        {w.name}
                      </div>
                      <p className="mt-2 font-sans text-sm text-text-secondary">{w.desc}</p>
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-champagne/15 border border-champagne/30 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-champagne">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-6 rounded-xl border border-white/[0.04] bg-black/20 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary/70 mb-1">
                      Audio Dynamics
                    </div>
                    <p className="font-sans text-xs leading-relaxed text-text-secondary/90">{w.detail}</p>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <Link
                    to="/experience"
                    onClick={() => setWorld(w.id)}
                    className="rounded-full bg-text-primary px-6 py-2.5 font-display text-xs font-semibold tracking-wide text-bg-primary transition-all hover:bg-white hover:scale-[1.02]"
                  >
                    Enter {w.name}
                  </Link>
                  {!isActive && (
                    <button
                      onClick={() => setWorld(w.id)}
                      className="rounded-full border border-white/[0.1] px-5 py-2.5 font-sans text-xs text-text-secondary hover:text-text-primary hover:border-white/25 transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </main>

      <MusicPlayer />
    </div>
  )
}
