import { useState, useEffect } from 'react'
import ExperienceCanvas from '@/three/ExperienceCanvas'
import MusicPlayer from '@/components/MusicPlayer/MusicPlayer'
import FrequencyAnalyzer from '@/components/VisualizerSettings/FrequencyAnalyzer'
import SettingsPanel from '@/components/VisualizerSettings/SettingsPanel'
import QuickSearchModal from '@/components/QuickSearchModal'
import { useStore } from '@/store/useStore'

export default function Experience() {
  const world = useStore((s) => s.world)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handleOpen = () => setShowSearch(true)
    window.addEventListener('open-quick-search', handleOpen)
    return () => window.removeEventListener('open-quick-search', handleOpen)
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <ExperienceCanvas />

      {/* Floating HUD controls on Experience screen */}
      <aside className="pointer-events-none absolute bottom-24 left-4 top-20 z-10 hidden w-60 flex-col gap-3 md:flex">
        {/* Quick Search in 3D */}
        <div className="pointer-events-auto rounded-xl border border-champagne/40 bg-champagne/10 p-3 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => setShowSearch(true)}
            className="flex w-full items-center justify-between font-display text-xs font-semibold text-champagne hover:text-text-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search Songs in 3D</span>
            </span>
            <span className="rounded bg-champagne/20 px-1.5 py-0.5 font-mono text-[9px]">1000+</span>
          </button>
        </div>

        <div className="pointer-events-auto rounded-xl border border-white/[0.06] bg-bg-secondary/70 p-3.5 backdrop-blur-xl shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary">
              Real-time FFT
            </span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-champagne animate-pulse" />
          </div>
          <FrequencyAnalyzer />
        </div>

        <div className="pointer-events-auto rounded-xl border border-white/[0.06] bg-bg-secondary/70 p-3.5 backdrop-blur-xl shadow-2xl">
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary">
            Active Environment
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="font-display text-sm font-medium capitalize text-text-primary">
              {world} World
            </div>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="text-[11px] font-sans text-champagne hover:text-text-primary transition-colors"
            >
              {showSettings ? 'Hide controls' : 'Tune visualizer'}
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="pointer-events-auto max-h-[50vh] overflow-y-auto rounded-xl border border-white/[0.06] bg-bg-secondary/85 p-4 backdrop-blur-xl shadow-2xl">
            <SettingsPanel />
          </div>
        )}
      </aside>

      {/* Quick Search Modal */}
      <QuickSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* Bottom compact player on Experience */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <MusicPlayer compact />
      </div>
    </div>
  )
}
