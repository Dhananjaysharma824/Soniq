import { useEffect, useMemo, useState, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import MusicPlayer from '@/components/MusicPlayer/MusicPlayer'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import { useStore, type Track } from '@/store/useStore'
import {
  getPopularTracks,
  searchTracks,
  type JamendoTrack,
} from '@/services/jamendoApi'
import { demoTracks } from '@/data/demoTracks'

const CATEGORIES = [
  { label: 'All Library', query: '' },
  { label: '🔥 Trending Bollywood', query: 'Bollywood Top Hits 2024' },
  { label: '❤️ Arijit Singh Hits', query: 'Arijit Singh' },
  { label: '⚡ Punjabi & Desi Beats', query: 'Punjabi Top Hits' },
  { label: '✨ 90s Golden Bollywood', query: '90s Bollywood Hits' },
  { label: '🪕 Indian Classical & Ragas', query: 'Indian Classical Sitar' },
  { label: '🌙 Sufi & Ghazals', query: 'Sufi Ghazal' },
  { label: '💖 Romantic Hindi', query: 'Romantic Hindi Songs' },
  { label: '🌐 Global Pop 100', query: 'Global Top Hits' },
  { label: '🌌 Synthwave 3D', query: 'Synthwave' },
  { label: '🎧 Lo-Fi Hindi', query: 'Lofi Hindi Beats' },
  { label: '💥 Electronic & EDM', query: 'EDM Electronic' },
  { label: '🎹 Ambient Soundscapes', query: 'Ambient Chill' },
]

const QUICK_SUGGESTIONS = [
  'Arijit Singh',
  'Kal Ho Naa Ho',
  'Diljit Dosanjh',
  'Shreya Ghoshal',
  'Pritam',
  'Sidhu Moose Wala',
  'A.R. Rahman',
  'Coke Studio',
  'Hans Zimmer',
  'The Weeknd',
  'Dua Lipa',
]

function mapJamendoTrack(jt: JamendoTrack): Track {
  return {
    id: jt.id.startsWith('itunes-') || jt.id.startsWith('saavn-') ? jt.id : `jamendo-${jt.id}`,
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

export default function Discover() {
  const navigate = useNavigate()
  const queue = useStore((s) => s.queue)
  const currentIndex = useStore((s) => s.currentIndex)
  const isPlaying = useStore((s) => s.isPlaying)
  const isBuffering = useStore((s) => s.isBuffering)
  const playTrackDirect = useStore((s) => s.playTrackDirect)
  const togglePlay = useStore((s) => s.togglePlay)
  const toggleFavourite = useStore((s) => s.toggleFavourite)
  const favourites = useStore((s) => s.favourites)
  const addToQueue = useStore((s) => s.addToQueue)
  const storeTracks = useStore((s) => s.tracks)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const [apiTracks, setApiTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [playlistModalTrack, setPlaylistModalTrack] = useState<Track | null>(null)
  const [, startTransition] = useTransition()

  // Pool of previously played/cached real tracks
  const localCatalog = useMemo(() => {
    const map = new Map<string, Track>()
    storeTracks.forEach((t) => {
      if (!t.id.startsWith('track-kal') && !t.src?.includes('soundhelix.com') && !t.src?.includes('wikivky/musicplayer')) {
        map.set(t.id, t)
      }
    })
    return Array.from(map.values())
  }, [storeTracks])

  // Fetch initial tracks on search/category change
  useEffect(() => {
    let active = true
    const term = searchQuery.trim() || activeCategory.query

    const fetchTracks = async () => {
      setLoading(true)
      setOffset(0)
      setHasMore(true)
      try {
        let results: JamendoTrack[] = []
        if (term) {
          results = await searchTracks(term, 40, 0)
        } else {
          results = await getPopularTracks(40, 0)
        }

        if (!active) return

        if (results && results.length > 0) {
          setApiTracks(results.map(mapJamendoTrack))
          setHasMore(results.length >= 30)
        } else {
          setApiTracks([])
          setHasMore(false)
        }
      } catch {
        if (!active) return
        setApiTracks([])
        setHasMore(false)
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = setTimeout(fetchTracks, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery, activeCategory])

  // Load more songs (pagination)
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextOffset = offset + 40
    const term = searchQuery.trim() || activeCategory.query || 'Bollywood'

    try {
      const results = await searchTracks(term, 40, nextOffset)
      if (results && results.length > 0) {
        const mapped = results.map(mapJamendoTrack)
        setApiTracks((prev) => {
          const seen = new Set(prev.map((x) => x.id))
          const fresh = mapped.filter((x) => !seen.has(x.id))
          return [...prev, ...fresh]
        })
        setOffset(nextOffset)
        setHasMore(results.length >= 25)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  // Filter local tracks and merge with API tracks
  const displayedTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    const filteredLocal = localCatalog.filter((t) => {
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q)) ||
        (t.genre && t.genre.toLowerCase().includes(q))
      )
    })

    if (apiTracks.length > 0) {
      const seen = new Set<string>()
      const combined: Track[] = []
      // Prioritize API results matching search, followed by local catalog
      for (const t of [...apiTracks, ...filteredLocal]) {
        if (!seen.has(t.id)) {
          seen.add(t.id)
          combined.push(t)
        }
      }
      return combined
    }

    return filteredLocal
  }, [apiTracks, localCatalog, searchQuery])

  const currentTrack = queue[currentIndex]

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay()
    } else {
      playTrackDirect(track)
    }
  }

  const handlePlayAll = () => {
    if (displayedTracks.length === 0) return
    useStore.setState({ queue: displayedTracks, currentIndex: 0 })
    useStore.getState().playTrack(0, displayedTracks)
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-32">
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-champagne animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-champagne">
              Global & Indian Music Vault • 1,000,000+ Tracks
            </p>
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl text-text-primary">
            Search & Discover Music
          </h1>
          <p className="mt-2 text-sm text-text-secondary max-w-2xl leading-relaxed">
            Search across millions of Bollywood hits, Punjabi tracks, Indian classical ragas, and global electronic soundscapes with real-time audio-reactive 3D visualization.
          </p>
        </motion.div>

        {/* Search Input Bar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xl">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              width="18"
              height="18"
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
              value={searchQuery}
              onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
              placeholder="Search across 1,000+ songs, artists, movies (e.g. Arijit Singh, Kal Ho Naa Ho, Diljit)..."
              className="w-full rounded-full border border-white/[0.1] bg-bg-secondary/80 py-3 pl-12 pr-10 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-all focus:border-champagne focus:ring-1 focus:ring-champagne/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-text-secondary hover:text-text-primary"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAll}
              className="inline-flex items-center gap-2 rounded-full bg-text-primary px-5 py-2.5 font-display text-xs font-semibold text-bg-primary transition-all duration-200 hover:bg-white hover:scale-105 shadow-lg"
              title="Play all tracks in current view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="8,5 19,12 8,19" />
              </svg>
              <span>Play All</span>
            </button>

            <span className="font-mono text-xs text-text-secondary">
              {displayedTracks.length} tracks loaded
            </span>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-text-secondary/70 mr-1">Trending Searches:</span>
          {QUICK_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSearchQuery(tag)
              }}
              className="rounded-full border border-white/[0.05] bg-bg-secondary/40 px-2.5 py-0.5 text-[11px] text-text-secondary hover:text-champagne hover:border-champagne/30 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Curated Categories */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = activeCategory.label === cat.label && !searchQuery
            return (
              <button
                key={cat.label}
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory(cat)
                }}
                className={clsx(
                  'whitespace-nowrap rounded-full px-4 py-2 font-sans text-xs tracking-wide transition-all duration-200',
                  active
                    ? 'bg-text-primary text-bg-primary font-medium shadow-md scale-[1.02]'
                    : 'border border-white/[0.06] bg-bg-secondary/50 text-text-secondary hover:text-text-primary hover:border-white/20',
                )}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Featured Spotlight Grid (Top Trending Picks) */}
        {!searchQuery && displayedTracks.length >= 4 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-champagne animate-pulse" />
                <h2 className="font-display text-lg font-semibold text-text-primary">
                  Spotlight Picks
                </h2>
              </div>
              <span className="font-mono text-[11px] text-text-secondary/70">Trending in 3D</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {displayedTracks.slice(0, 6).map((t) => {
                const isCurrent = currentTrack?.id === t.id
                const isCurrentPlaying = isCurrent && isPlaying

                return (
                  <div
                    key={`feat-${t.id}`}
                    onClick={() => handlePlay(t)}
                    className="group relative cursor-pointer rounded-2xl border border-white/[0.06] bg-bg-secondary/40 hover:bg-surface/70 p-3 transition-all duration-300 hover:border-champagne/40 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface border border-white/[0.06]">
                      <img
                        src={t.artwork}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23191A19"/><circle cx="50" cy="50" r="24" fill="none" stroke="%23C5A875" stroke-width="2"/></svg>'
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlay(t)
                        }}
                        className={clsx(
                          'absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-champagne text-bg-primary shadow-xl transition-all duration-200',
                          isCurrent
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 hover:scale-110',
                        )}
                        aria-label="Play"
                      >
                        {isCurrentPlaying ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="5" width="4" height="14" rx="1" />
                            <rect x="14" y="5" width="4" height="14" rx="1" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                            <polygon points="8,5 19,12 8,19" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="mt-2.5">
                      <div
                        className={clsx(
                          'truncate font-display text-xs font-semibold',
                          isCurrent ? 'text-champagne' : 'text-text-primary group-hover:text-champagne transition-colors',
                        )}
                      >
                        {t.title}
                      </div>
                      <div className="truncate text-[11px] text-text-secondary mt-0.5">{t.artist}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Track List */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-medium text-text-primary">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : `${activeCategory.label} Tracks`}
            </h2>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-champagne font-mono">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-champagne border-t-transparent animate-spin" />
                <span>Searching audio streams...</span>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayedTracks.map((t) => {
              const isCurrent = currentTrack?.id === t.id
              const isCurrentPlaying = isCurrent && isPlaying
              const isCurrentBuffering = isCurrent && isBuffering
              const isFav = favourites.includes(t.id)

              return (
                <div
                  key={t.id}
                  className={clsx(
                    'group flex items-center justify-between gap-3 rounded-2xl border p-2.5 sm:p-3 transition-all duration-200',
                    isCurrent
                      ? 'border-champagne/60 bg-surface/90 shadow-xl'
                      : 'border-white/[0.05] bg-bg-secondary/40 hover:border-white/[0.12] hover:bg-surface/50',
                  )}
                >
                  {/* Artwork & Play overlay (Fixed compact square) */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 min-w-[56px] min-h-[56px] flex-shrink-0 overflow-hidden rounded-xl bg-surface border border-white/[0.08] shadow-sm">
                      <img
                        src={t.artwork}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23191A19"/><circle cx="50" cy="50" r="24" fill="none" stroke="%23C5A875" stroke-width="2"/></svg>'
                        }}
                      />
                      <button
                        onClick={() => handlePlay(t)}
                        className={clsx(
                          'absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px] transition-opacity',
                          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                        aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
                      >
                        {isCurrentBuffering ? (
                          <div className="h-4 w-4 rounded-full border-2 border-champagne border-t-transparent animate-spin" />
                        ) : isCurrentPlaying ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#F3F1EC">
                            <rect x="6" y="5" width="4" height="14" rx="1" />
                            <rect x="14" y="5" width="4" height="14" rx="1" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#F3F1EC" className="translate-x-[1px]">
                            <polygon points="8,5 19,12 8,19" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          onClick={() => handlePlay(t)}
                          className={clsx(
                            'cursor-pointer truncate font-display text-sm font-medium transition-colors',
                            isCurrent ? 'text-champagne font-semibold' : 'text-text-primary hover:text-champagne',
                          )}
                        >
                          {t.title}
                        </div>
                        {isCurrentPlaying && (
                          <div className="flex items-end gap-0.5 h-3 flex-shrink-0" title="Now playing live">
                            <span className="w-0.5 h-full bg-champagne rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-0.5 h-2 bg-champagne rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-0.5 h-3 bg-champagne rounded-full animate-bounce [animation-delay:300ms]" />
                            <span className="w-0.5 h-1.5 bg-champagne rounded-full animate-bounce [animation-delay:450ms]" />
                          </div>
                        )}
                      </div>
                      <div className="truncate text-xs text-text-secondary mt-0.5">
                        {t.artist}
                      </div>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-text-secondary/70">
                        {t.genre && (
                          <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-text-secondary">
                            {t.genre}
                          </span>
                        )}
                        <span>{fmtTime(t.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        handlePlay(t)
                        navigate('/experience')
                      }}
                      title="Play and view in 3D audio-reactive world"
                      className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-champagne/40 bg-champagne/10 px-2 sm:px-2.5 py-1 font-mono text-[10px] sm:text-[11px] text-champagne hover:bg-champagne hover:text-bg-primary transition-all shadow-sm whitespace-nowrap"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-champagne animate-pulse" />
                      <span>{isCurrent ? '3D View' : <><span className="hidden sm:inline">Play in </span>3D</>}</span>
                    </button>

                    <button
                      onClick={() => addToQueue(t)}
                      title="Add to queue"
                      className="rounded-lg p-1.5 sm:p-2 text-text-secondary/70 hover:text-text-primary hover:bg-white/[0.05] transition-colors"
                      aria-label="Add to queue"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    <button
                      onClick={() => setPlaylistModalTrack(t)}
                      title="Add to playlist"
                      className="rounded-lg p-2 text-text-secondary/70 hover:text-champagne hover:bg-white/[0.05] transition-colors"
                      aria-label="Add to playlist"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01" />
                      </svg>
                    </button>

                    <button
                      onClick={() => toggleFavourite(t.id, t)}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      className={clsx(
                        'rounded-lg p-2 transition-colors',
                        isFav ? 'text-champagne' : 'text-text-secondary/70 hover:text-text-primary hover:bg-white/[0.05]',
                      )}
                      aria-label="Favorite"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More Button (Allows paginating up to 1000+ songs) */}
          {displayedTracks.length > 0 && hasMore && (
            <div className="mt-10 flex flex-col items-center justify-center gap-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2.5 rounded-full border border-champagne/40 bg-surface/80 px-8 py-3 font-display text-xs font-medium tracking-wide text-champagne hover:bg-champagne hover:text-bg-primary hover:border-transparent transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Loading more tracks...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Load More Tracks ({displayedTracks.length} loaded • Explore 1,000+)</span>
                  </>
                )}
              </button>
              <span className="font-mono text-[10px] text-text-secondary/60">
                Millions of Bollywood, Hindi, Punjabi & International songs available
              </span>
            </div>
          )}

          {displayedTracks.length === 0 && !loading && (
            <div className="rounded-2xl border border-white/[0.04] bg-bg-secondary/30 p-12 text-center">
              <div className="font-display text-base font-medium text-text-primary">
                No matching tracks found
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Try searching for "Arijit", "Bollywood", "Diljit", "Rave", or click one of the trending categories above.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory(CATEGORIES[0])
                }}
                className="mt-4 rounded-full border border-white/[0.1] px-5 py-2 text-xs text-text-primary hover:border-white/30"
              >
                Reset Search
              </button>
            </div>
          )}
        </section>
      </main>

      <AddToPlaylistModal
        track={playlistModalTrack}
        isOpen={Boolean(playlistModalTrack)}
        onClose={() => setPlaylistModalTrack(null)}
      />

      <MusicPlayer />
    </div>
  )
}
