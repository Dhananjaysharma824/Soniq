import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { useStore, type Track } from '@/store/useStore'
import { fetchLyrics, type LyricsData } from '@/services/lyricsService'

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function NowPlayingModal({
  isOpen,
  onClose,
  track,
  onOpenEq,
}: {
  isOpen: boolean
  onClose: () => void
  track: Track | null
  onOpenEq: () => void
}) {
  const [viewMode, setViewMode] = useState<'art' | 'lyrics'>('art')
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null)
  const [loadingLyrics, setLoadingLyrics] = useState(false)

  const isPlaying = useStore((s) => s.isPlaying)
  const isBuffering = useStore((s) => s.isBuffering)
  const currentTime = useStore((s) => s.currentTime)
  const duration = useStore((s) => s.duration)
  const togglePlay = useStore((s) => s.togglePlay)
  const next = useStore((s) => s.next)
  const prev = useStore((s) => s.prev)
  const seek = useStore((s) => s.seek)
  const shuffle = useStore((s) => s.shuffle)
  const toggleShuffle = useStore((s) => s.toggleShuffle)
  const repeat = useStore((s) => s.repeat)
  const cycleRepeat = useStore((s) => s.cycleRepeat)
  const favourites = useStore((s) => s.favourites)
  const toggleFavourite = useStore((s) => s.toggleFavourite)
  const isFav = track ? favourites.includes(track.id) : false

  const activeLineRef = useRef<HTMLDivElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !track) return
    let active = true
    setLoadingLyrics(true)

    fetchLyrics(track.title, track.artist, track.duration).then((res) => {
      if (!active) return
      setLyricsData(res)
      setLoadingLyrics(false)
    })

    return () => {
      active = false
    }
  }, [isOpen, track?.id, track?.title, track?.artist])

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

  useEffect(() => {
    if (viewMode === 'lyrics' && activeIndex >= 0 && activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeIndex, viewMode])

  if (!isOpen || !track) return null

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary text-text-primary animate-in fade-in duration-300 overflow-hidden">
      {/* Dynamic Ambient Background Blur */}
      {track.artwork && (
        <div
          className="pointer-events-none absolute inset-0 opacity-25 filter blur-3xl scale-125 transition-all duration-700"
          style={{
            backgroundImage: `url(${track.artwork})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-bg-primary/80 to-bg-primary" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/[0.06] backdrop-blur-md">
        <button
          onClick={onClose}
          className="rounded-full p-2 text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-colors"
          title="Minimize player"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary">Playing from SONIQ</span>
          <span className="font-display text-xs font-semibold text-text-primary mt-0.5">
            {track.album || 'Free High-Fidelity Audio'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenEq}
            className="rounded-full p-2 text-text-secondary hover:text-champagne hover:bg-white/[0.08] transition-colors"
            title="Studio Equalizer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Center Area: Switch between Album Art & Live Lyrics */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
        {viewMode === 'art' ? (
          <div className="flex flex-col items-center max-w-sm w-full">
            <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[360px] rounded-3xl overflow-hidden shadow-2xl border border-white/[0.1] bg-surface group">
              {track.artwork ? (
                <img src={track.artwork} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-text-secondary">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}

              {/* Live equalizing animation badge */}
              {isPlaying && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 flex items-center gap-1.5 border border-white/[0.1]">
                  <span className="h-1.5 w-1.5 rounded-full bg-champagne animate-pulse" />
                  <span className="font-mono text-[10px] text-champagne font-medium">320kbps</span>
                </div>
              )}
            </div>

            {/* Quick Lyrics Teaser Card */}
            {lyricsData && (
              <button
                onClick={() => setViewMode('lyrics')}
                className="mt-6 flex w-full items-center justify-between rounded-2xl border border-champagne/30 bg-champagne/10 px-4 py-2.5 backdrop-blur-xl hover:bg-champagne/20 transition-all text-left"
              >
                <div className="flex items-center gap-2 text-champagne">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                  <span className="font-display text-xs font-semibold">View Live Lyrics</span>
                </div>
                <span className="font-mono text-[10px] text-champagne font-medium">Open →</span>
              </button>
            )}
          </div>
        ) : (
          /* Live Synchronized Lyrics Mode */
          <div className="flex flex-col h-full w-full max-w-xl">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
              <span className="font-display text-xs font-bold text-champagne flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-champagne animate-pulse" />
                Live Karaoke Lyrics
              </span>
              <button
                onClick={() => setViewMode('art')}
                className="font-mono text-[11px] text-text-secondary hover:text-text-primary px-2 py-1 rounded-lg bg-white/[0.06]"
              >
                Show Artwork
              </button>
            </div>

            <div
              ref={lyricsContainerRef}
              className="flex-1 overflow-y-auto px-4 py-8 space-y-6 select-none"
            >
              {loadingLyrics && (
                <div className="flex items-center justify-center h-40 text-xs font-mono text-champagne">
                  Loading lyrics...
                </div>
              )}
              {!loadingLyrics &&
                lyricsData?.lines.map((line, idx) => {
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
                            ? 'text-2xl sm:text-3xl font-bold text-champagne scale-[1.02] drop-shadow-[0_0_12px_rgba(197,168,117,0.4)]'
                            : isPast
                            ? 'text-lg sm:text-xl font-medium text-text-primary/40'
                            : 'text-lg sm:text-xl font-medium text-text-primary/20 hover:text-text-primary/50'
                          : 'text-base sm:text-lg text-text-primary/80',
                      )}
                    >
                      {line.text}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Transport Controls */}
      <div className="relative z-10 px-6 pb-8 pt-4 max-w-2xl w-full mx-auto">
        {/* Track Title & Fav */}
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg sm:text-xl font-bold text-text-primary">{track.title}</h2>
            <p className="truncate text-sm text-text-secondary mt-0.5">{track.artist}</p>
          </div>
          <button
            onClick={() => toggleFavourite(track.id, track)}
            className={clsx('p-2.5 transition-transform active:scale-90', isFav ? 'text-champagne' : 'text-text-secondary hover:text-text-primary')}
            title={isFav ? 'Liked' : 'Like'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="space-y-1.5">
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              seek(pos * (duration || track.duration || 180))
            }}
            className="relative h-2 w-full rounded-full bg-white/[0.12] cursor-pointer group"
          >
            <div
              className="h-full rounded-full bg-champagne transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[11px] text-text-secondary">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration || track.duration || 180)}</span>
          </div>
        </div>

        {/* Action Controls: Shuffle, Prev, Play, Next, Repeat */}
        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={toggleShuffle}
            className={clsx('p-2 transition-colors', shuffle ? 'text-champagne' : 'text-text-secondary hover:text-text-primary')}
            title="Shuffle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>

          <button
            onClick={prev}
            className="p-2 text-text-secondary hover:text-text-primary active:scale-90 transition-transform"
            aria-label="Previous"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={() => togglePlay()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-text-primary text-bg-primary shadow-2xl hover:scale-105 active:scale-95 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <div className="h-6 w-6 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
            ) : isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={next}
            className="p-2 text-text-secondary hover:text-text-primary active:scale-90 transition-transform"
            aria-label="Next"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          <button
            onClick={cycleRepeat}
            className={clsx('relative p-2 transition-colors', repeat !== 'off' ? 'text-champagne' : 'text-text-secondary hover:text-text-primary')}
            title={`Repeat: ${repeat}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {repeat === 'one' && (
              <span className="absolute -top-1 right-0 text-[9px] font-mono font-bold text-champagne">1</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
