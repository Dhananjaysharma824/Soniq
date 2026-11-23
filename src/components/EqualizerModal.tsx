import { useState } from 'react'
import clsx from 'clsx'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

const EQ_PRESETS = [
  { id: 'flat', name: 'Flat', desc: 'Balanced sound without coloration', bass: 0, mid: 0, treble: 0 },
  { id: 'bass', name: 'Bass Boost 🔥', desc: 'Punchy 808s and heavy low end', bass: 7, mid: 0, treble: -1 },
  { id: 'electronic', name: 'Hip-Hop / DHH ⚡', desc: 'Crisp rap vocals with deep kick', bass: 6, mid: -1, treble: 5 },
  { id: 'vocal', name: 'Vocal Booster 🎤', desc: 'Brings voices and lyrics to front', bass: -2, mid: 5, treble: 2 },
  { id: 'acoustic', name: 'Acoustic / Sufi 🪕', desc: 'Warm instruments and natural tone', bass: 2, mid: 2, treble: 3 },
  { id: 'treble', name: 'Treble Boost ✨', desc: 'Bright highs and acoustic sparkle', bass: -1, mid: 0, treble: 6 },
] as const

export default function EqualizerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentPreset = useStore((s) => s.eqPreset)
  const setEqPresetStore = useStore((s) => s.setEqPreset)
  const [activePreset, setActivePreset] = useState<string>(currentPreset || 'flat')
  const [bass, setBass] = useState(0)
  const [mid, setMid] = useState(0)
  const [treble, setTreble] = useState(0)

  const handleSelectPreset = (p: typeof EQ_PRESETS[number]) => {
    setActivePreset(p.id)
    setBass(p.bass)
    setMid(p.mid)
    setTreble(p.treble)
    audioEngine.setEqPreset(p.id as 'flat' | 'bass' | 'vocal' | 'treble' | 'electronic' | 'acoustic')
    setEqPresetStore(p.id as 'flat' | 'bass' | 'vocal' | 'treble' | 'electronic' | 'acoustic')
  }

  const handleCustomEq = (newBass: number, newMid: number, newTreble: number) => {
    setBass(newBass)
    setMid(newMid)
    setTreble(newTreble)
    setActivePreset('custom')
    audioEngine.setEq(newBass, newMid, newTreble)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.1] bg-bg-secondary/95 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-champagne/15 text-champagne border border-champagne/25">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-text-primary">Studio Audio Equalizer</h2>
              <p className="font-sans text-[11px] text-text-secondary">Hardware-accelerated sound enhancement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sliders */}
        <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl bg-bg-primary/60 p-4 border border-white/[0.04]">
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">Bass (Low)</span>
            <input
              type="range"
              min="-6"
              max="10"
              step="0.5"
              value={bass}
              onChange={(e) => handleCustomEq(parseFloat(e.target.value), mid, treble)}
              className="accent-champagne h-28 w-2 appearance-none bg-white/[0.1] rounded-lg cursor-pointer [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
            />
            <span className="font-mono text-[11px] font-semibold text-champagne">{bass > 0 ? `+${bass}` : bass} dB</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">Mids (Voice)</span>
            <input
              type="range"
              min="-6"
              max="10"
              step="0.5"
              value={mid}
              onChange={(e) => handleCustomEq(bass, parseFloat(e.target.value), treble)}
              className="accent-champagne h-28 w-2 appearance-none bg-white/[0.1] rounded-lg cursor-pointer [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
            />
            <span className="font-mono text-[11px] font-semibold text-champagne">{mid > 0 ? `+${mid}` : mid} dB</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">Treble (Air)</span>
            <input
              type="range"
              min="-6"
              max="10"
              step="0.5"
              value={treble}
              onChange={(e) => handleCustomEq(bass, mid, parseFloat(e.target.value))}
              className="accent-champagne h-28 w-2 appearance-none bg-white/[0.1] rounded-lg cursor-pointer [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
            />
            <span className="font-mono text-[11px] font-semibold text-champagne">{treble > 0 ? `+${treble}` : treble} dB</span>
          </div>
        </div>

        {/* Presets List */}
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-2.5">
            Spotify Tuning Presets
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {EQ_PRESETS.map((p) => {
              const isSelected = activePreset === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={clsx(
                    'flex flex-col items-start rounded-xl p-2.5 text-left transition-all border',
                    isSelected
                      ? 'border-champagne bg-champagne/15 text-text-primary shadow-sm'
                      : 'border-white/[0.06] bg-surface/50 text-text-secondary hover:border-white/[0.12] hover:bg-surface hover:text-text-primary',
                  )}
                >
                  <span className={clsx('font-display text-xs font-semibold', isSelected ? 'text-champagne' : '')}>
                    {p.name}
                  </span>
                  <span className="text-[10px] text-text-secondary/70 mt-0.5 line-clamp-1">{p.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
