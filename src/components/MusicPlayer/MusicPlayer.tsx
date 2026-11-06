import { useCallback, useRef, useState, useEffect, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore, type Track } from '@/store/useStore'
import { audioEngine } from '@/audio/AudioEngine'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MusicPlayer({ compact = false }: { compact?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [showQueue, setShowQueue] = useState(false)
  const [showSleepMenu, setShowSleepMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekVal, setSeekVal] = useState(0)
  const [playlistModalTrack, setPlaylistModalTrack] = useState<Track | null>(null)

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
  const playbackRate = useStore((s) => s.playbackRate)
  const setPlaybackRate = useStore((s) => s.setPlaybackRate)
  const eqPreset = useStore((s) => s.eqPreset)
  const setEqPreset = useStore((s) => s.setEqPreset)
  const sleepTimerRemaining = useStore((s) => s.sleepTimerRemaining)
  const setSleepTimer = useStore((s) => s.setSleepTimer)
  const decrementSleepTimer = useStore((s) => s.decrementSleepTimer)

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
  const clearQueue = useStore((s) => s.clearQueue)
  const toggleFavourite = useStore((s) => s.toggleFavourite)
  const favourites = useStore((s) => s.favourites)

  const track = queue[currentIndex]
  const isExperience = location.pathname === '/experience'
  const isFav = track ? favourites.includes(track.id) : false

  // Keyboard shortcut event listener for '?'
  useEffect(() => {
    const onToggle = () => setShowShortcutsModal((v) => !v)
    window.addEventListener('toggle-shortcuts-modal', onToggle)
    return () => window.removeEventListener('toggle-shortcuts-modal', onToggle)
  }, [])

  // Sleep timer interval countdown
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0) return
    const interval = setInterval(() => {
      decrementSleepTimer()
    }, 1000)
    return () => clearInterval(interval)
  }, [sleepTimerRemaining, decrementSleepTimer])

  // Native OS MediaSession API Integration (Lockscreen, Notification Bar, Keyboard/Earphone Controls)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'SONIQ',
        artwork: track.artwork
          ? [
              { src: track.artwork, sizes: '96x96', type: 'image/jpeg' },
              { src: track.artwork, sizes: '128x128', type: 'image/jpeg' },
              { src: track.artwork, sizes: '256x256', type: 'image/jpeg' },
              { src: track.artwork, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      })
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

      const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
        ['play', () => togglePlay()],
        ['pause', () => togglePlay()],
        ['nexttrack', () => next()],
        ['previoustrack', () => prev()],
        ['seekto', (details) => { if (details.seekTime != null) seek(details.seekTime) }],
        ['seekforward', () => seek(Math.min(duration || 0, currentTime + 10))],
        ['seekbackward', () => seek(Math.max(0, currentTime - 10))],
      ]

      for (const [action, handler] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, handler)
        } catch {
          /* unsupported action */
        }
      }
    } catch {
      /* ignore */
    }
  }, [track, isPlaying, duration, currentTime, togglePlay, next, prev, seek])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleCycleSpeed = () => {
    const SPEEDS = [0.75, 1, 1.25, 1.5, 2]
    const curIdx = SPEEDS.indexOf(playbackRate)
    const nextIdx = (curIdx + 1) % SPEEDS.length
    const nextSpeed = SPEEDS[nextIdx >= 0 ? nextIdx : 1]
    setPlaybackRate(nextSpeed)
    showToast(`Speed: ${nextSpeed}x`)
  }

  const handleDownload = async () => {
    if (!track) return
    try {
      showToast('Downloading audio track...')
      const res = await fetch(track.src)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${track.artist} - ${track.title}.mp3`.replace(/[/\\?%*:|"<>]/g, '')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Downloaded to device!')
    } catch {
      window.open(track.src, '_blank')
      showToast('Downloading via new tab...')
    }
  }

  const handleShare = async () => {
    if (!track) return
    const shareData = {
      title: track.title,
      text: `Listening to "${track.title}" by ${track.artist} on SONIQ!`,
      url: window.location.href,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        /* fallback */
      }
    }
    await navigator.clipboard.writeText(`${track.title} - ${track.artist} on SONIQ`)
    showToast('Song info copied to clipboard!')
  }

  const formatSleepTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s.toString().padStart(2, '0')}s`
  }

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
              ? 'absolute bottom-16 right-4 w-84 rounded-2xl max-h-88 overflow-y-auto'
              : 'fixed bottom-24 right-6 w-96 rounded-2xl max-h-[420px] overflow-y-auto',
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-semibold text-text-primary tracking-wide">
                Up Next
              </span>
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                {queue.length} {queue.length === 1 ? 'song' : 'songs'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {queue.length > 0 && (
                <button
                  onClick={() => clearQueue()}
                  className="text-[11px] font-mono text-red-400/80 hover:text-red-400 hover:underline transition-colors"
                  title="Clear entire queue"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowQueue(false)}
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-colors"
                title="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {queue.map((t, idx) => {
              const active = idx === currentIndex
              return (
                <div
                  key={`${t.id}-${idx}`}
                  onClick={() => playTrack(idx)}
                  className={clsx(
                    'group flex items-center justify-between gap-2.5 rounded-xl p-2 cursor-pointer transition-all border',
                    active
                      ? 'border-champagne/40 bg-champagne/10 shadow-sm'
                      : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.04]',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-surface flex-shrink-0 border border-white/[0.06]">
                      {t.artwork ? (
                        <img
                          src={t.artwork}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none'
                            const sibling = e.currentTarget.nextElementSibling as HTMLElement
                            if (sibling) sibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        style={{ display: t.artwork ? 'none' : 'flex' }}
                        className="h-full w-full items-center justify-center text-text-secondary/70 bg-surface"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>

                      {active && isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-0.5 h-full bg-champagne rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-0.5 h-2 bg-champagne rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-0.5 h-3 bg-champagne rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={clsx('truncate text-xs font-medium', active ? 'text-champagne font-semibold' : 'text-text-primary group-hover:text-champagne transition-colors')}>
                        {t.title}
                      </div>
                      <div className="truncate text-[10px] text-text-secondary mt-0.5">{t.artist}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromQueue(idx)
                      }}
                      className="p-1.5 rounded-lg text-text-secondary/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove from queue"
                      aria-label="Remove from queue"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
            {queue.length === 0 && (
              <div className="text-center py-8 px-4 text-xs text-text-secondary flex flex-col items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary/40">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <span className="font-medium text-text-primary/70">Queue is empty</span>
                <span className="text-[11px] text-text-secondary/60 max-w-[200px]">
                  Search any song and click Play or "+ Queue" to build your up next list.
                </span>
              </div>
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
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                  <div className="flex items-end gap-0.5 h-3.5">
                    <span className="w-0.5 h-full bg-champagne rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-0.5 h-2.5 bg-champagne rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-0.5 h-3.5 bg-champagne rounded-full animate-bounce [animation-delay:300ms]" />
                    <span className="w-0.5 h-2 bg-champagne rounded-full animate-bounce [animation-delay:450ms]" />
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-[13px] font-medium text-text-primary">
                  {track?.title ?? 'No audio loaded'}
                </span>
                {track && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => toggleFavourite(track.id, track)}
                      className={clsx('transition-colors p-0.5', isFav ? 'text-champagne' : 'text-text-secondary/50 hover:text-text-primary')}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setPlaylistModalTrack(track)}
                      className="text-text-secondary/50 hover:text-champagne transition-colors p-0.5"
                      title="Add to playlist"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01" />
                      </svg>
                    </button>
                  </div>
                )}
                {!isExperience && track && (
                  <button
                    onClick={() => navigate('/experience')}
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-champagne/40 bg-champagne/10 px-2 py-0.5 text-[10px] font-mono text-champagne hover:bg-champagne hover:text-bg-primary transition-all shadow-sm flex-shrink-0"
                    title="View live 3D sculpture reacting to this track"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-champagne animate-pulse" />
                    <span>3D View</span>
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

          {/* RIGHT: Volume, Speed, Sleep Timer, More Options & Queue */}
          <div className="flex w-[35%] items-center justify-end gap-2 md:gap-3 relative">
            <button
              onClick={() => fileRef.current?.click()}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1 font-sans text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
              title="Upload audio file"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Upload
            </button>

            {/* Playback Speed Pill */}
            <button
              onClick={handleCycleSpeed}
              className={clsx(
                'rounded-lg px-2 py-1 font-mono text-[11px] font-semibold transition-colors',
                playbackRate !== 1
                  ? 'bg-champagne/15 text-champagne border border-champagne/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06]',
              )}
              title={`Playback Speed: ${playbackRate}x (Click to cycle)`}
            >
              {playbackRate}x
            </button>

            {/* Sleep Timer Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSleepMenu((v) => !v)
                  setShowMoreMenu(false)
                }}
                className={clsx(
                  'rounded-lg p-1.5 transition-colors flex items-center gap-1',
                  sleepTimerRemaining !== null
                    ? 'bg-champagne/15 text-champagne'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06]',
                )}
                title={sleepTimerRemaining ? `Sleep timer: ${formatSleepTimer(sleepTimerRemaining)} remaining` : 'Sleep Timer'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                {sleepTimerRemaining !== null && (
                  <span className="font-mono text-[10px] font-bold text-champagne">
                    {Math.ceil(sleepTimerRemaining / 60)}m
                  </span>
                )}
              </button>

              {/* Sleep Timer Dropdown */}
              {showSleepMenu && (
                <div className="absolute bottom-10 right-0 z-50 w-44 rounded-xl border border-white/[0.1] bg-bg-secondary/95 p-2 shadow-2xl backdrop-blur-2xl space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-text-secondary/70 border-b border-white/[0.06] mb-1">
                    Sleep Timer
                  </div>
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        setSleepTimer(mins)
                        setShowSleepMenu(false)
                        showToast(`Sleep timer set for ${mins} minutes`)
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-white/[0.08] text-text-secondary hover:text-champagne transition-colors flex items-center justify-between"
                    >
                      <span>{mins} minutes</span>
                      {sleepTimerRemaining && Math.round(sleepTimerRemaining / 60) === mins && (
                        <span className="text-champagne">✓</span>
                      )}
                    </button>
                  ))}
                  {sleepTimerRemaining !== null && (
                    <button
                      onClick={() => {
                        setSleepTimer(null)
                        setShowSleepMenu(false)
                        showToast('Sleep timer turned off')
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Turn Off Timer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="text-text-secondary hover:text-text-primary transition-colors p-1"
                aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
                title={`Volume: ${Math.round((muted ? 0 : volume) * 100)}%`}
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

              <div className="relative group/vol flex items-center">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-16 sm:w-20 hidden sm:block"
                  aria-label="Volume level"
                />
                <span className="hidden group-hover/vol:block absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-surface border border-white/[0.1] px-1.5 py-0.5 text-[9px] font-mono text-champagne shadow-md pointer-events-none">
                  {Math.round((muted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* More Options Menu (•••) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowMoreMenu((v) => !v)
                  setShowSleepMenu(false)
                }}
                className={clsx(
                  'rounded-lg p-1.5 transition-colors',
                  showMoreMenu ? 'text-champagne bg-white/[0.08]' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06]',
                )}
                title="Sound & Player Options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                  <circle cx="5" cy="12" r="2" />
                </svg>
              </button>

              {/* More Options Dropdown */}
              {showMoreMenu && (
                <div className="absolute bottom-10 right-0 z-50 w-52 rounded-xl border border-white/[0.1] bg-bg-secondary/95 p-2 shadow-2xl backdrop-blur-2xl space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-text-secondary/70 border-b border-white/[0.06] mb-1">
                    Sound & Options
                  </div>

                  {track && (
                    <>
                      <button
                        onClick={() => {
                          handleDownload()
                          setShowMoreMenu(false)
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-white/[0.08] text-text-secondary hover:text-champagne transition-colors flex items-center gap-2"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        <span>Download MP3</span>
                      </button>

                      <button
                        onClick={() => {
                          handleShare()
                          setShowMoreMenu(false)
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-white/[0.08] text-text-secondary hover:text-champagne transition-colors flex items-center gap-2"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        <span>Share Song</span>
                      </button>
                    </>
                  )}

                  {/* Equalizer Presets */}
                  <div className="pt-1 mt-1 border-t border-white/[0.06]">
                    <div className="px-2 py-1 text-[10px] font-mono text-text-secondary/70">
                      Audio EQ Preset
                    </div>
                    {(['flat', 'bass', 'vocal', 'treble', 'electronic', 'acoustic'] as const).map((eq) => (
                      <button
                        key={eq}
                        onClick={() => {
                          setEqPreset(eq)
                          setShowMoreMenu(false)
                          showToast(`Audio EQ: ${eq.charAt(0).toUpperCase() + eq.slice(1)}`)
                        }}
                        className="w-full text-left px-2.5 py-1 text-xs rounded-lg hover:bg-white/[0.08] text-text-secondary hover:text-champagne transition-colors flex items-center justify-between capitalize"
                      >
                        <span>{eq === 'flat' ? 'Flat (Original)' : `${eq} Boost`}</span>
                        {eqPreset === eq && <span className="text-champagne">✓</span>}
                      </button>
                    ))}
                  </div>

                  {/* Keyboard Shortcuts Trigger */}
                  <div className="pt-1 mt-1 border-t border-white/[0.06]">
                    <button
                      onClick={() => {
                        setShowShortcutsModal(true)
                        setShowMoreMenu(false)
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-white/[0.08] text-text-secondary hover:text-champagne transition-colors flex items-center gap-2"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <line x1="6" y1="8" x2="6" y2="8" />
                        <line x1="10" y1="8" x2="10" y2="8" />
                        <line x1="14" y1="8" x2="14" y2="8" />
                      </svg>
                      <span>Keyboard Shortcuts</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Queue Toggle Button */}
            <button
              onClick={() => setShowQueue((v) => !v)}
              className={clsx(
                'rounded-lg p-1.5 transition-colors',
                showQueue ? 'text-champagne bg-white/[0.08]' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06]',
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

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full border border-champagne/40 bg-bg-secondary/95 px-4 py-1.5 text-xs font-medium text-champagne shadow-2xl backdrop-blur-xl flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-champagne animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AddToPlaylistModal
        track={playlistModalTrack}
        isOpen={Boolean(playlistModalTrack)}
        onClose={() => setPlaylistModalTrack(null)}
      />

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </>
  )
}
