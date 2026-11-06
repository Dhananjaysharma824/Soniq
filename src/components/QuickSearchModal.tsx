import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { searchTracks, type JamendoTrack } from '@/services/jamendoApi'
import { useStore, type Track } from '@/store/useStore'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'

function mapTrack(jt: JamendoTrack): Track {
  return {
    id: jt.id.startsWith('itunes-') || jt.id.startsWith('saavn-') ? jt.id : `saavn-${jt.id}`,
    title: jt.name,
    artist: jt.artist_name,
    album: jt.album_name,
    duration: jt.duration,
    src: jt.audio || jt.audiodownload,
    artwork: jt.album_image || jt.image,
    genre: jt.genre,
    licenseUrl: jt.license_ccurl,
  }
}

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s <= 0) return '3:20'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function QuickSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [playlistModalTrack, setPlaylistModalTrack] = useState<Track | null>(null)
  const [queuedId, setQueuedId] = useState<string | null>(null)
  const playTrackDirect = useStore((s) => s.playTrackDirect)
  const addToQueue = useStore((s) => s.addToQueue)
  const currentTrack = useStore((s) => s.queue[s.currentIndex])
  const isPlaying = useStore((s) => s.isPlaying)
  const favourites = useStore((s) => s.favourites)
  const toggleFavourite = useStore((s) => s.toggleFavourite)

  useEffect(() => {
    if (!isOpen) return
    const term = query.trim() || 'Bollywood Top Hits'
    let active = true

    const fetchSongs = async () => {
      setLoading(true)
      try {
        const res = await searchTracks(term, 20, 0)
        if (active && res) {
          setResults(res.map(mapTrack))
        }
      } catch {
        if (active) setResults([])
      } finally {
        if (active) setLoading(false)
      }
    }

    const t = setTimeout(fetchSongs, 250)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.1] bg-bg-secondary/95 p-5 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-champagne animate-pulse" />
            <h2 className="font-display text-sm font-semibold text-text-primary tracking-wide">
              Search & Play Live in 3D
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Input */}
        <div className="relative mt-4">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any song, artist, movie (e.g. Kal Ho Naa Ho, Arijit, Diljit)..."
            className="w-full rounded-xl border border-white/[0.1] bg-bg-primary/80 py-2.5 pl-10 pr-10 text-xs text-text-primary placeholder:text-text-secondary/60 outline-none transition-all focus:border-champagne focus:ring-1 focus:ring-champagne/40"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-secondary hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-champagne font-mono">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-champagne border-t-transparent animate-spin" />
              <span>Searching full-length audio tracks...</span>
            </div>
          )}

          {!loading && results.map((t) => {
            const isCurrent = currentTrack?.id === t.id
            const isCurrentPlaying = isCurrent && isPlaying

            return (
              <div
                key={t.id}
                onClick={() => {
                  playTrackDirect(t)
                  onClose()
                }}
                className={`group flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-champagne/60 bg-surface/90 shadow-md'
                    : 'border-white/[0.04] bg-bg-primary/40 hover:border-white/[0.12] hover:bg-surface/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-surface border border-white/[0.06]">
                    <img src={t.artwork} alt="" className="h-full w-full object-cover" />
                    {isCurrentPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 h-full bg-champagne rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-0.5 h-2 bg-champagne rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-0.5 h-3 bg-champagne rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-text-primary group-hover:text-champagne transition-colors">
                      {t.title}
                    </div>
                    <div className="truncate text-[10px] text-text-secondary mt-0.5">
                      {t.artist}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                  <span className="hidden sm:inline-block text-[10px] font-mono text-text-secondary/70">{fmtTime(t.duration)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      addToQueue(t)
                      setQueuedId(t.id)
                      setTimeout(() => setQueuedId(null), 1500)
                    }}
                    className={clsx(
                      'p-1.5 rounded-lg transition-all',
                      queuedId === t.id
                        ? 'text-champagne bg-champagne/20'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.08]',
                    )}
                    title={queuedId === t.id ? 'Added to Queue' : 'Add to Queue'}
                  >
                    {queuedId === t.id ? (
                      <span className="text-[10px] font-mono text-champagne font-medium">✓ Queued</span>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="16" y2="18" />
                        <line x1="19" y1="15" x2="19" y2="21" />
                        <line x1="16" y1="18" x2="22" y2="18" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavourite(t.id, t)
                    }}
                    className={`p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors ${
                      favourites.includes(t.id) ? 'text-champagne' : 'text-text-secondary hover:text-text-primary'
                    }`}
                    title={favourites.includes(t.id) ? 'Remove Favorite' : 'Add to Favorites'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={favourites.includes(t.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPlaylistModalTrack(t)
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-champagne hover:bg-white/[0.08] transition-colors"
                    title="Add to Playlist"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      playTrackDirect(t)
                      onClose()
                    }}
                    className="rounded-full bg-champagne/15 border border-champagne/40 px-2 sm:px-2.5 py-1 text-[10px] font-mono text-champagne hover:bg-champagne hover:text-bg-primary transition-all whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Play in </span><span>3D</span>
                  </button>
                </div>
              </div>
            )
          })}

          {!loading && results.length === 0 && (
            <div className="py-8 text-center text-xs text-text-secondary">
              No matching songs found. Try typing a different artist or song name.
            </div>
          )}
        </div>
      </div>

      <AddToPlaylistModal
        track={playlistModalTrack}
        isOpen={Boolean(playlistModalTrack)}
        onClose={() => setPlaylistModalTrack(null)}
      />
    </div>
  )
}

