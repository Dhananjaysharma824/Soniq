import { useEffect, useState, useRef } from 'react'
import clsx from 'clsx'
import { fetchLyrics, type LyricsData } from '@/services/lyricsService'
import { useStore, type Track } from '@/store/useStore'

export default function LyricsModal({
  isOpen,
  onClose,
  track,
}: {
  isOpen: boolean
  onClose: () => void
  track: Track | null
}) {
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null)
  const [loading, setLoading] = useState(false)
  const currentTime = useStore((s) => s.currentTime)
  const isPlaying = useStore((s) => s.isPlaying)
  const togglePlay = useStore((s) => s.togglePlay)
  const seek = useStore((s) => s.seek)
  const activeLineRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !track) return
    let active = true
    setLoading(true)

    fetchLyrics(track.title, track.artist, track.duration).then((data) => {
      if (!active) return
      setLyricsData(data)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [isOpen, track?.id, track?.title, track?.artist])

  // Find active line index based on current playback time
  const activeIndex = (() => {
    if (!lyricsData || !lyricsData.synced || lyricsData.lines.length === 0) return -1
    let idx = -1
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (currentTime >= lyricsData.lines[i].time - 0.25) {
        idx = i
      } else {
        break
      }
    }
    return idx
  })()

  // Auto-scroll to center active line
  useEffect(() => {
    if (activeIndex >= 0 && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeIndex])

  if (!isOpen || !track) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col h-full max-h-[85vh] w-full max-w-2xl rounded-3xl border border-white/[0.1] bg-bg-secondary/95 shadow-2xl overflow-hidden">
        {/* Ambient Glow from Artwork */}
        {track.artwork && (
          <div
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${track.artwork})`,
              backgroundSize: 'cover',
            }}
          />
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-6 border-b border-white/[0.06] bg-bg-secondary/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            {track.artwork && (
              <img
                src={track.artwork}
                alt=""
                className="h-11 w-11 rounded-xl object-cover border border-white/[0.08] shadow-md flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-sm sm:text-base font-bold text-text-primary">
                  {track.title}
                </h3>
                {lyricsData?.synced && (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SYNCED
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-text-secondary mt-0.5">{track.artist}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-colors"
            title="Close lyrics"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Lyrics Body */}
        <div
          ref={containerRef}
          className="relative z-10 flex-1 overflow-y-auto px-6 py-10 sm:px-12 space-y-6 sm:space-y-8 select-none"
        >
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-text-secondary">
              <div className="h-6 w-6 rounded-full border-2 border-champagne border-t-transparent animate-spin" />
              <p className="font-mono text-xs text-champagne/80 tracking-wide">
                Searching live synchronized lyrics...
              </p>
            </div>
          )}

          {!loading && !lyricsData && (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-text-secondary mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="font-display text-sm font-semibold text-text-primary">No lyrics found for this song</p>
              <p className="text-xs text-text-secondary/70 max-w-xs mt-1">
                Lyrics are available for most popular Bollywood, DHH, and Global releases. Try another track!
              </p>
            </div>
          )}

          {!loading &&
            lyricsData &&
            lyricsData.lines.map((line, idx) => {
              const isActive = idx === activeIndex
              const isPast = idx < activeIndex

              return (
                <div
                  key={`${line.time}-${idx}`}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => {
                    if (line.time >= 0) seek(line.time)
                  }}
                  className={clsx(
                    'transition-all duration-300 cursor-pointer font-display leading-relaxed',
                    lyricsData.synced
                      ? isActive
                        ? 'text-xl sm:text-2xl md:text-3xl font-bold text-champagne scale-[1.02] drop-shadow-[0_0_12px_rgba(197,168,117,0.4)]'
                        : isPast
                        ? 'text-base sm:text-lg md:text-xl font-medium text-text-primary/40 hover:text-text-primary/70'
                        : 'text-base sm:text-lg md:text-xl font-medium text-text-primary/25 hover:text-text-primary/60'
                      : 'text-base sm:text-lg text-text-primary/80',
                  )}
                >
                  {line.text}
                </div>
              )
            })}
        </div>

        {/* Bottom Playbar Controls within Lyrics Modal */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-t border-white/[0.06] bg-bg-secondary/90 backdrop-blur-xl">
          <div className="text-[11px] font-mono text-text-secondary/60">
            {lyricsData?.synced ? '💡 Tap any line to jump to that moment' : 'Full Track Lyrics'}
          </div>
          <button
            onClick={() => togglePlay()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-champagne text-bg-primary shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
