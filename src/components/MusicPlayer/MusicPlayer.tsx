import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore, type Track } from '@/store/useStore'
import { audioEngine } from '@/audio/AudioEngine'

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicPlayer({ compact = false }: { compact?: boolean }) {
  const location = useLocation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showQueue, setShowQueue] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekVal, setSeekVal] = useState(0)

  const queue = useStore((s) => s.queue)
  const currentIndex = useStore((s) => s.currentIndex)
  const isPlaying = useStore((s) => s.isPlaying)
  const isBuffering = useStore((s) => s.isBuffering)
  const playbackError = useStore((s) => s.playbackError)
  const currentTime = useStore((s) => s.currentTime)
  const duration = useStore((s) => s.duration)
  const volume = useStore((s) => s.volume)
  const muted = useStore((s) => s.muted)
  const shuffle = useStore((s) => s.shuffle)
  const repeat = useStore((s) => s.repeat)

  const togglePlay = useStore((s) => s.togglePlay)
  const next = useStore((s) => s.next)
  const prev = useStore((s) => s.prev)
  const seek = useStore((s) => s.seek)
  const setVolume = useStore((s) => s.setVolume)
  const toggleMute = useStore((s) => s.toggleMute)
  const toggleShuffle = useStore((s) => s.toggleShuffle)
  const cycleRepeat = useStore((s) => s.cycleRepeat)
  const addTracks = useStore((s) => s.addTracks)
  const playTrack = useStore((s) => s.playTrack)
  const removeFromQueue = useStore((s) => s.removeFromQueue)
  const toggleFavourite = useStore((s) => s.toggleFavourite)
  const favourites = useStore((s) => s.favourites)

  const track = queue[currentIndex]
  const isExperience = location.pathname === '/experience'
  const isFav = track ? favourites.includes(track.id) : false

  const onUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      const newTracks: Track[] = Array.from(files).map((f, i) => ({
        id: `local-${Date.now()}-${i}`,
        title: f.name.replace(/\.[^.]+$/, ''),
        artist: 'Local Audio',
        duration: 0,
        src: URL.createObjectURL(f),
        isLocal: true,
        artwork: `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#191A19"/><circle cx="100" cy="100" r="36" fill="none" stroke="#C5A875" stroke-width="1.5"/><polygon points="92,84 92,116 118,100" fill="#C5A875"/></svg>`,
        )}`,
      }))
      addTracks(newTracks)

      audioEngine.init().then(() => {
        const q = useStore.getState().queue
        const idx = q.findIndex((t) => t.id === newTracks[0].id)
        if (idx >= 0) playTrack(idx)
      })
      e.target.value = ''
    },
    [addTracks, playTrack],
  )

  // Don't render full player on /experience if not compact
  if (isExperience && !compact) return null

  return (
    <>
      {/* Queue Drawer Modal / Flyout */}
      {showQueue && (
        <div
          className={clsx(
            'z-50 border border-white/[0.08] bg-bg-secondary/95 backdrop-blur-2xl shadow-2xl p-4 transition-all',
            compact
              ? 'absolute bottom-16 right-4 w-80 rounded-2xl max-h-80 overflow-y-auto'
              : 'fixed bottom-24 right-6 w-84 rounded-2xl max-h-96 overflow-y-auto',
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-2">
            <span className="font-display text-xs font-semibold text-text-primary tracking-wide">
              Up Next ({queue.length})
            </span>
            <button
              onClick={() => setShowQueue(false)}
              className="text-text-secondary hover:text-text-primary text-xs"
            >
              Close
            </button>
          </div>

          <div className="space-y-1">
            {queue.map((t, idx) => {
              const active = idx === currentIndex
              return (
                <div
                  key={`${t.id}-${idx}`}
                  className={clsx(
                    'flex items-center justify-between gap-2 rounded-lg p-2 transition-colors',
                    active ? 'bg-white/[0.08] text-champagne' : 'hover:bg-white/[0.03] text-text-secondary',
                  )}
                >
                  <button
                    onClick={() => playTrack(idx)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <img src={t.artwork} alt="" className="h-8 w-8 rounded object-cover bg-surface flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className={clsx('truncate text-xs font-medium', active ? 'text-champagne' : 'text-text-primary')}>
                        {t.title}
                      </div>
                      <div className="truncate text-[10px] text-text-secondary">{t.artist}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="text-text-secondary hover:text-text-primary p-1 text-xs opacity-60 hover:opacity-100"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {queue.length === 0 && (
              <div className="text-center py-6 text-xs text-text-secondary">Queue is empty</div>
            )}
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div
        className={clsx(
          'transition-all duration-300',
          compact
            ? 'mx-4 mb-4 rounded-2xl border border-white/[0.08] bg-bg-secondary/80 backdrop-blur-2xl shadow-2xl'
            : 'fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-bg-secondary/85 backdrop-blur-2xl',
        )}
      >
        <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={onUpload} />

        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2.5 md:px-8">
          {/* LEFT: Track Info */}
          <div className="flex min-w-0 w-[30%] items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-surface border border-white/[0.05]">
              {track?.artwork ? (
                <img src={track.artwork} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-text-secondary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-[13px] font-medium text-text-primary">
                  {track?.title ?? 'No audio loaded'}
                </span>
                {track && (
                  <button
                    onClick={() => toggleFavourite(track.id)}
                    className={clsx('transition-colors', isFav ? 'text-champagne' : 'text-text-secondary/50 hover:text-text-primary')}
                    title="Favorite"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="truncate text-[11px] text-text-secondary">
                {track?.artist ?? 'Upload or choose a track'}
              </div>
              {playbackError && (
                <div className="truncate text-[10px] text-champagne/90">{playbackError}</div>
              )}
            </div>
          </div>

          {/* CENTER: Transport Controls & Seek */}
          <div className="flex flex-1 flex-col items-center gap-1 max-w-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={clsx('p-1 text-xs transition-colors', shuffle ? 'text-champagne' : 'text-text-secondary hover:text-text-primary')}
                title="Shuffle"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
              </button>

              <button
                onClick={prev}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                title="Previous track"
                aria-label="Previous"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                </svg>
              </button>

              <button
                onClick={() => togglePlay()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-text-primary text-bg-primary transition-transform duration-150 hover:scale-105 active:scale-95 shadow-md"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isBuffering ? (
                  <div className="h-4 w-4 rounded-full border-2 border-bg-primary border-t-transparent animate-spin" />
                ) : isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={next}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors"
                title="Next track"
                aria-label="Next"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              <button
                onClick={cycleRepeat}
                className={clsx('p-1 text-xs transition-colors', repeat !== 'off' ? 'text-champagne' : 'text-text-secondary hover:text-text-primary')}
                title={`Repeat: ${repeat}`}
              >
                {repeat === 'one' ? (
                  <span className="font-mono text-[10px] font-bold text-champagne">1</span>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Seek Bar */}
            <div className="flex w-full items-center gap-2.5 text-[10px] font-mono tabular-nums text-text-secondary">
              <span className="w-8 text-right">
                {fmt(isSeeking ? seekVal : currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : (track?.duration || 180)}
                step={0.1}
                value={Math.min(
                  isSeeking ? seekVal : currentTime,
                  duration > 0 ? duration : (track?.duration || 180),
                )}
                onPointerDown={() => {
                  setIsSeeking(true)
                  setSeekVal(currentTime)
                }}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setSeekVal(val)
                  if (!isSeeking) seek(val)
                }}
                onPointerUp={(e) => {
                  const val = Number((e.target as HTMLInputElement).value)
                  seek(val)
                  setIsSeeking(false)
                }}
                className="flex-1"
                aria-label="Seek time"
              />
              <span className="w-8">{fmt(duration > 0 ? duration : (track?.duration || 0))}</span>
            </div>
          </div>

          {/* RIGHT: Volume, Upload & Queue */}
          <div className="flex w-[30%] items-center justify-end gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1 font-sans text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
              title="Upload audio file"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Upload
            </button>

            <button
              onClick={toggleMute}
              className="text-text-secondary hover:text-text-primary transition-colors"
              aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 hidden md:block"
              aria-label="Volume level"
            />

            <button
              onClick={() => setShowQueue((v) => !v)}
              className={clsx(
                'rounded-lg p-1.5 transition-colors',
                showQueue ? 'text-champagne bg-white/[0.08]' : 'text-text-secondary hover:text-text-primary',
              )}
              title="Show queue"
              aria-label="Queue"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
