import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause playback' },
  { key: '→ / ←', desc: 'Seek forward / backward (5s, or 10s with Shift)' },
  { key: '↑ / ↓', desc: 'Increase / decrease volume (5%)' },
  { key: 'M', desc: 'Mute / Unmute audio' },
  { key: 'N', desc: 'Next track in queue' },
  { key: 'P', desc: 'Previous track in queue' },
  { key: 'S', desc: 'Toggle Shuffle mode' },
  { key: 'R', desc: 'Cycle Repeat mode (Off / All / One)' },
  { key: 'L', desc: 'Like / Add to Favourites' },
  { key: '?', desc: 'Show / Hide Keyboard Shortcuts' },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 transition-all"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-bg-secondary/95 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-champagne">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="6" y2="8" />
              <line x1="10" y1="8" x2="10" y2="8" />
              <line x1="14" y1="8" x2="14" y2="8" />
              <line x1="18" y1="8" x2="18" y2="8" />
              <line x1="6" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="18" y2="12" />
              <line x1="7" y1="16" x2="17" y2="16" />
            </svg>
            <h3 className="font-display text-base font-semibold text-text-primary">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {SHORTCUTS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.03] bg-white/[0.02] px-3 py-2 text-xs"
            >
              <span className="text-text-secondary">{item.desc}</span>
              <kbd className="rounded-md border border-white/[0.12] bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-semibold text-champagne shadow-sm whitespace-nowrap">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] text-center text-[11px] text-text-secondary/70">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-champagne font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  )
}

