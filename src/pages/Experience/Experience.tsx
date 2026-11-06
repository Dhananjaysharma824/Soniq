import { useState } from 'react'
import ExperienceCanvas from '@/three/ExperienceCanvas'
import MusicPlayer from '@/components/MusicPlayer/MusicPlayer'
import FrequencyAnalyzer from '@/components/VisualizerSettings/FrequencyAnalyzer'
import SettingsPanel from '@/components/VisualizerSettings/SettingsPanel'
import { useStore } from '@/store/useStore'

export default function Experience() {
  const world = useStore((s) => s.world)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <ExperienceCanvas />

      {/* Floating HUD controls on Experience screen */}
      <aside className="pointer-events-none absolute bottom-24 left-4 top-20 z-10 hidden w-60 flex-col gap-3 md:flex">
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

      {/* Bottom compact player on Experience */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <MusicPlayer compact />
      </div>
    </div>
  )
}
