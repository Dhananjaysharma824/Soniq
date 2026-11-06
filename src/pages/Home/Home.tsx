import { Suspense, useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { motion } from 'framer-motion'
import MusicPlayer from '@/components/MusicPlayer/MusicPlayer'
import QuickSearchModal from '@/components/QuickSearchModal'
import Sculpture from '@/three/Sculpture'
import Particles from '@/three/Particles'
import AudioBridge from '@/three/AudioBridge'
import { useStore } from '@/store/useStore'

function HeroCanvas() {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5.4], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#080909']} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[4, 5, 3]} intensity={1.2} color="#F3F1EC" />
        <pointLight position={[-4, -2, 2]} intensity={0.5} color="#C5A875" />
        <pointLight position={[3, -1, 4]} intensity={0.3} color="#8a9098" />
        <AudioBridge />
        <Suspense fallback={null}>
          <Sculpture scale={1.0} />
          <Particles count={900} radius={7} color="#8a9098" />
          <Environment preset="night" environmentIntensity={0.5} />
        </Suspense>
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.35} luminanceThreshold={0.45} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.12} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export default function Home() {
  const container = useRef<HTMLDivElement>(null)
  const queue = useStore((s) => s.queue)
  const isPlaying = useStore((s) => s.isPlaying)
  const togglePlay = useStore((s) => s.togglePlay)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handleOpen = () => setShowSearch(true)
    window.addEventListener('open-quick-search', handleOpen)
    return () => window.removeEventListener('open-quick-search', handleOpen)
  }, [])

  return (
    <div ref={container} className="relative bg-bg-primary">
      {/* ─── HERO ─── */}
      <section className="relative flex h-[100vh] items-center justify-center overflow-hidden -mt-[60px]">
        <HeroCanvas />

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg-primary/30 via-transparent to-bg-primary" />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mb-5 font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-text-secondary"
          >
            A new dimension of music
          </motion.p>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-semibold tracking-tighter text-text-primary leading-[0.95]"
          >
            ENTER THE
            <br />
            <span className="text-silver">FREQUENCY.</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-7 max-w-lg font-sans text-[15px] leading-relaxed text-text-secondary"
          >
            Where every beat creates a world. Music analyzed in real&nbsp;time, shaping a living 3D environment around you.
          </motion.p>

          {/* Interactive Search Bar directly on Home Hero */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.48 }}
            onClick={() => setShowSearch(true)}
            className="pointer-events-auto mx-auto mt-6 flex w-full max-w-md items-center justify-between rounded-full border border-white/[0.14] bg-bg-secondary/75 px-4 py-2.5 backdrop-blur-xl shadow-2xl hover:border-champagne/60 hover:bg-bg-secondary/95 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5 text-text-secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="group-hover:text-champagne transition-colors">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="font-sans text-xs sm:text-sm text-text-secondary/80 group-hover:text-text-primary transition-colors">
                Search any song in 3D (e.g. Aankhein, Arijit)...
              </span>
            </div>
            <span className="rounded-full bg-champagne/15 border border-champagne/30 px-2.5 py-0.5 font-mono text-[10px] text-champagne font-medium">
              Search
            </span>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-3.5"
          >
            <Link
              to="/experience"
              onClick={() => {
                if (!isPlaying && queue.length) useStore.getState().playTrack(0)
                else togglePlay()
              }}
              className="rounded-full bg-text-primary px-7 py-3 font-display text-[12px] font-semibold tracking-wide text-bg-primary transition-all duration-200 hover:bg-white hover:scale-[1.02]"
            >
              ENTER EXPERIENCE
            </Link>
            <Link
              to="/worlds"
              className="rounded-full border border-white/[0.12] px-7 py-3 font-display text-[12px] font-semibold tracking-wide text-text-primary transition-all duration-200 hover:border-white/25 hover:bg-white/[0.03]"
            >
              EXPLORE WORLDS
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-[9px] font-sans font-medium uppercase tracking-[0.2em] text-text-secondary/60">
              Scroll
            </span>
            <div className="h-6 w-px bg-gradient-to-b from-text-secondary/30 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="mx-auto max-w-6xl px-6 py-28 md:px-10">
        <div className="grid gap-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-sans text-[10px] font-medium uppercase tracking-[0.25em] text-champagne">
              The Experience
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-[2.8rem] leading-[1.1]">
              Music that shapes<br />the world.
            </h2>
            <p className="mt-5 max-w-md font-sans text-[15px] leading-relaxed text-text-secondary">
              SONIQ analyzes bass, mids, treble, waveform and rhythmic transients in real&nbsp;time.
              The central sculpture deforms, particles accelerate, and each environment responds
              to the sound you play.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { t: 'Real Audio Analysis', d: 'FFT spectrum and waveform from the Web Audio API.' },
              { t: 'Beat Detection', d: 'Adaptive transient detection drives pulses and motion.' },
              { t: 'Four Worlds', d: 'Space, Ocean, Dream and Tunnel — each uniquely reactive.' },
              { t: 'Your Music', d: 'Upload tracks or discover music via Jamendo.' },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-xl border border-white/[0.04] bg-bg-secondary/60 p-5 transition-colors hover:border-white/[0.08]"
              >
                <div className="font-display text-[13px] font-medium">{c.t}</div>
                <div className="mt-2 font-sans text-[12px] leading-relaxed text-text-secondary">{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WORLDS PREVIEW ─── */}
      <section className="border-t border-white/[0.04] py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Immersive worlds
            </h2>
            <Link to="/worlds" className="font-sans text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors">
              View all →
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { id: 'space', name: 'Space', desc: 'Planets, orbits and star fields driven by frequency.', c: 'from-[#0a0e1a] to-[#141e30]' },
              { id: 'ocean', name: 'Ocean', desc: 'Fluid surfaces, waves and depth.', c: 'from-[#040f16] to-[#0a2838]' },
              { id: 'dream', name: 'Dream', desc: 'Glass sculptures and surreal forms.', c: 'from-[#0e0a16] to-[#221838]' },
              { id: 'tunnel', name: 'Tunnel', desc: 'Endless geometric tunnel pulsing to beat.', c: 'from-[#0a0b0e] to-[#181a20]' },
            ].map((w) => (
              <Link
                key={w.id}
                to="/worlds"
                className={`group rounded-2xl border border-white/[0.04] bg-gradient-to-br ${w.c} p-6 transition-all duration-200 hover:border-white/[0.08] hover:scale-[1.01]`}
              >
                <div className="font-display text-lg font-medium">{w.name}</div>
                <p className="mt-2 font-sans text-[12px] leading-relaxed text-text-secondary">{w.desc}</p>
                <div className="mt-6 font-sans text-[11px] font-medium text-champagne opacity-0 transition-opacity group-hover:opacity-100">
                  Enter world →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-white/[0.04] py-24 text-center">
        <p className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Don't just hear it. <span className="text-champagne">Feel it.</span>
        </p>
        <Link
          to="/experience"
          className="mt-7 inline-block rounded-full bg-text-primary px-7 py-3 font-display text-[12px] font-semibold tracking-wide text-bg-primary transition-all duration-200 hover:bg-white hover:scale-[1.02]"
        >
          Open Experience
        </Link>
      </section>

      <div className="h-24" />
      <MusicPlayer />
      <QuickSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  )
}
