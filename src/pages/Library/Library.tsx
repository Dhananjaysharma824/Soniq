import { useState } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import MusicPlayer from '@/components/MusicPlayer/MusicPlayer'
import AddToPlaylistModal from '@/components/AddToPlaylistModal'
import { useStore, type Track, type Playlist } from '@/store/useStore'

function fmtDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s > 0 ? `${s}s` : ''}`
}

export default function Library() {
  const tracks = useStore((s) => s.tracks)
  const queue = useStore((s) => s.queue)
  const currentIndex = useStore((s) => s.currentIndex)
  const isPlaying = useStore((s) => s.isPlaying)
  const playTrackDirect = useStore((s) => s.playTrackDirect)
  const playTrack = useStore((s) => s.playTrack)
  const togglePlay = useStore((s) => s.togglePlay)
  const favourites = useStore((s) => s.favourites)
  const toggleFavourite = useStore((s) => s.toggleFavourite)
  const recentlyPlayed = useStore((s) => s.recentlyPlayed)
  const playlists = useStore((s) => s.playlists)
  const createPlaylist = useStore((s) => s.createPlaylist)
  const renamePlaylist = useStore((s) => s.renamePlaylist)
  const deletePlaylist = useStore((s) => s.deletePlaylist)
  const removeTrackFromPlaylist = useStore((s) => s.removeTrackFromPlaylist)

  const [activeTab, setActiveTab] = useState<'favourites' | 'playlists' | 'recent'>('favourites')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(playlists[0]?.id ?? null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleVal, setEditTitleVal] = useState('')
  const [playlistModalTrack, setPlaylistModalTrack] = useState<Track | null>(null)

  // Hydrate tracks accurately from cached library
  const favTracks = tracks.filter((t) => favourites.includes(t.id))
  const recentTracks = recentlyPlayed.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[]

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0] || null
  const playlistTracks = selectedPlaylist
    ? (selectedPlaylist.trackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[])
    : []

  const currentTrack = queue[currentIndex]

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay()
    } else {
      playTrackDirect(track)
    }
  }

  const handlePlayFavourites = (shuffle = false) => {
    if (favTracks.length === 0) return
    const ordered = shuffle ? [...favTracks].sort(() => Math.random() - 0.5) : favTracks
    useStore.setState({ queue: ordered })
    playTrack(0, ordered)
  }

  const handlePlayPlaylist = (pl: Playlist, shuffle = false) => {
    const list = pl.trackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[]
    if (list.length === 0) return
    const ordered = shuffle ? [...list].sort(() => Math.random() - 0.5) : list
    useStore.setState({ queue: ordered })
    playTrack(0, ordered)
  }

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    const pl = createPlaylist(newPlaylistName.trim())
    setSelectedPlaylistId(pl.id)
    setNewPlaylistName('')
    setShowCreateModal(false)
  }

  const handleSaveRename = () => {
    if (selectedPlaylist && editTitleVal.trim()) {
      renamePlaylist(selectedPlaylist.id, editTitleVal.trim())
    }
    setIsEditingTitle(false)
  }

  const totalFavSeconds = favTracks.reduce((acc, t) => acc + (t.duration || 0), 0)
  const totalPlaylistSeconds = playlistTracks.reduce((acc, t) => acc + (t.duration || 0), 0)

  return (
    <div className="min-h-screen bg-bg-primary pb-32">
      <main className="mx-auto max-w-6xl px-6 pt-20 sm:pt-24 pb-12 md:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-champagne">
            Library
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl text-text-primary">
            Your Sound Collection
          </h1>
          <p className="mt-2 text-sm text-text-secondary max-w-xl">
            Custom playlists and favorite tracks automatically stay saved across refreshes.
          </p>
        </motion.div>

        {/* Library Navigation Tabs */}
        <div className="mt-8 flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex gap-2">
            {[
              { id: 'favourites' as const, label: 'Favorites', count: favTracks.length },
              { id: 'playlists' as const, label: 'Playlists', count: playlists.length },
              { id: 'recent' as const, label: 'Recently Played', count: recentTracks.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'rounded-full px-4 py-1.5 font-sans text-xs tracking-wide transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-text-primary text-bg-primary font-medium'
                    : 'border border-white/[0.06] bg-bg-secondary/40 text-text-secondary hover:text-text-primary hover:border-white/20',
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-champagne/40 bg-champagne/10 px-4 py-1.5 text-xs font-medium text-champagne hover:bg-champagne/20 transition-colors"
          >
            <span>+ New Playlist</span>
          </button>
        </div>

        {/* Modal: New Playlist */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-bg-secondary p-6 shadow-2xl">
              <h3 className="font-display text-lg font-semibold text-text-primary">Create New Playlist</h3>
              <p className="mt-1 text-xs text-text-secondary">Give your playlist an evocative title.</p>
              <form onSubmit={handleCreatePlaylist} className="mt-5 space-y-4">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Deep Space Focus, Midnight Drift..."
                  autoFocus
                  className="w-full rounded-xl border border-white/[0.1] bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-champagne"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg px-4 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-text-primary px-5 py-2 text-xs font-semibold text-bg-primary hover:bg-white transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 1: FAVORITES */}
        {activeTab === 'favourites' && (
          <section className="mt-8">
            {favTracks.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.04] bg-bg-secondary/30 p-12 text-center">
                <div className="font-display text-base font-medium text-text-primary">No favorite tracks yet</div>
                <p className="mt-2 text-xs text-text-secondary">
                  Tap the heart icon on any track in Discover, Search or the player to save it here permanently.
                </p>
              </div>
            ) : (
              <div>
                {/* Header Controls for Liked Songs */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-4 border-b border-white/[0.06]">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-text-primary">Liked Songs</h2>
                    <p className="font-mono text-xs text-text-secondary mt-1">
                      {favTracks.length} tracks • {fmtDuration(totalFavSeconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlayFavourites(false)}
                      className="rounded-full bg-text-primary px-5 py-2 font-display text-xs font-semibold text-bg-primary hover:bg-white transition-all shadow-md"
                    >
                      Play All
                    </button>
                    <button
                      onClick={() => handlePlayFavourites(true)}
                      className="rounded-full border border-white/[0.1] px-4 py-2 font-sans text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
                    >
                      Shuffle
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {favTracks.map((t) => {
                    const isCurrent = currentTrack?.id === t.id
                    return (
                      <div
                        key={t.id}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-bg-secondary/40 p-3 hover:border-white/[0.1] hover:bg-surface/50 transition-all"
                      >
                        <button
                          onClick={() => handlePlayTrack(t)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <img src={t.artwork} alt="" className="h-12 w-12 rounded-lg object-cover bg-surface flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className={clsx('truncate text-sm font-medium', isCurrent ? 'text-champagne' : 'text-text-primary')}>
                              {t.title}
                            </div>
                            <div className="truncate text-xs text-text-secondary mt-0.5">{t.artist}</div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPlaylistModalTrack(t)}
                            className="text-text-secondary/60 hover:text-champagne p-2 text-xs transition-colors"
                            title="Add to playlist"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01" />
                            </svg>
                          </button>

                          <button
                            onClick={() => toggleFavourite(t.id, t)}
                            className="text-champagne p-2 hover:opacity-75 transition-opacity"
                            title="Remove from favorites"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: PLAYLISTS */}
        {activeTab === 'playlists' && (
          <section className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
            {/* Playlist Sidebar / Mobile Swipe Row */}
            <div className="flex overflow-x-auto pb-2 scrollbar-none gap-2 md:flex-col md:space-y-2 md:overflow-visible md:pb-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-shrink-0 md:w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-champagne/40 bg-champagne/5 px-4 py-2.5 md:py-3 text-xs font-semibold text-champagne hover:bg-champagne/15 transition-all md:mb-3 whitespace-nowrap"
              >
                <span>+ New Playlist</span>
              </button>

              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    setSelectedPlaylistId(pl.id)
                    setIsEditingTitle(false)
                  }}
                  className={clsx(
                    'flex-shrink-0 md:w-full flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 md:py-3 text-left transition-all whitespace-nowrap md:whitespace-normal',
                    selectedPlaylistId === pl.id
                      ? 'border border-champagne/30 bg-surface text-text-primary'
                      : 'border border-transparent bg-bg-secondary/40 text-text-secondary hover:text-text-primary hover:bg-surface/50',
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-medium">{pl.name}</div>
                    <div className="font-mono text-[10px] text-text-secondary">{pl.trackIds.length} tracks</div>
                  </div>
                  {selectedPlaylistId === pl.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-champagne flex-shrink-0" />
                  )}
                </button>
              ))}
              {playlists.length === 0 && (
                <div className="text-xs text-text-secondary py-4 text-center">No playlists created yet</div>
              )}
            </div>

            {/* Selected Playlist View */}
            <div>
              {selectedPlaylist ? (
                <div className="rounded-2xl border border-white/[0.06] bg-bg-secondary/40 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/[0.06]">
                    <div className="min-w-0 flex-1">
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editTitleVal}
                            onChange={(e) => setEditTitleVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                            className="rounded-lg border border-champagne/40 bg-surface px-3 py-1 font-display text-xl text-text-primary outline-none"
                          />
                          <button
                            onClick={handleSaveRename}
                            className="rounded-md bg-champagne px-3 py-1 font-sans text-xs font-semibold text-bg-primary"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-2xl font-semibold text-text-primary">{selectedPlaylist.name}</h2>
                          <button
                            onClick={() => {
                              setEditTitleVal(selectedPlaylist.name)
                              setIsEditingTitle(true)
                            }}
                            className="text-text-secondary hover:text-text-primary p-1 text-xs"
                            title="Rename playlist"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                      <p className="font-mono text-xs text-text-secondary mt-1">
                        {playlistTracks.length} tracks • {fmtDuration(totalPlaylistSeconds)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlayPlaylist(selectedPlaylist, false)}
                        disabled={playlistTracks.length === 0}
                        className="rounded-full bg-text-primary px-5 py-2 font-display text-xs font-semibold text-bg-primary hover:bg-white disabled:opacity-40 transition-all shadow-md"
                      >
                        Play All
                      </button>
                      <button
                        onClick={() => handlePlayPlaylist(selectedPlaylist, true)}
                        disabled={playlistTracks.length === 0}
                        className="rounded-full border border-white/[0.1] px-4 py-2 font-sans text-xs text-text-secondary hover:text-text-primary hover:border-white/20 disabled:opacity-40 transition-colors"
                      >
                        Shuffle
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete playlist "${selectedPlaylist.name}"?`)) {
                            deletePlaylist(selectedPlaylist.id)
                          }
                        }}
                        className="text-text-secondary hover:text-red-400 p-2 text-xs transition-colors"
                        title="Delete playlist"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Tracks in playlist */}
                  <div className="mt-5 space-y-2">
                    {playlistTracks.map((t, idx) => {
                      const isCurrent = currentTrack?.id === t.id
                      return (
                        <div
                          key={`${t.id}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all"
                        >
                          <button
                            onClick={() => handlePlayTrack(t)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span className="font-mono text-xs text-text-secondary/50 w-4">{idx + 1}</span>
                            <img src={t.artwork} alt="" className="h-10 w-10 rounded-md object-cover bg-surface flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className={clsx('truncate text-sm font-medium', isCurrent ? 'text-champagne' : 'text-text-primary')}>
                                {t.title}
                              </div>
                              <div className="truncate text-xs text-text-secondary">{t.artist}</div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavourite(t.id, t)}
                              className={clsx(
                                'p-2 text-xs transition-colors',
                                favourites.includes(t.id) ? 'text-champagne' : 'text-text-secondary/50 hover:text-text-primary',
                              )}
                              title="Favorite"
                            >
                              ♥
                            </button>
                            <button
                              onClick={() => removeTrackFromPlaylist(selectedPlaylist.id, t.id)}
                              className="text-text-secondary hover:text-red-400 p-2 text-xs opacity-60 hover:opacity-100 transition-colors"
                              title="Remove from playlist"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {playlistTracks.length === 0 && (
                      <div className="text-center py-10 text-xs text-text-secondary">
                        No tracks added yet. Browse Discover or Search to add songs to this playlist!
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-text-secondary text-sm">Select or create a playlist.</div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: RECENTLY PLAYED */}
        {activeTab === 'recent' && (
          <section className="mt-8">
            {recentTracks.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.04] bg-bg-secondary/30 p-12 text-center">
                <div className="font-display text-base font-medium text-text-primary">No playback history yet</div>
                <p className="mt-2 text-xs text-text-secondary">Play any track to record your listening journey here.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentTracks.map((t) => {
                  const isCurrent = currentTrack?.id === t.id
                  return (
                    <div
                      key={t.id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-bg-secondary/40 p-3 hover:border-white/[0.1] hover:bg-surface/50 transition-all"
                    >
                      <button
                        onClick={() => handlePlayTrack(t)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <img src={t.artwork} alt="" className="h-12 w-12 rounded-lg object-cover bg-surface flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className={clsx('truncate text-sm font-medium', isCurrent ? 'text-champagne' : 'text-text-primary')}>
                            {t.title}
                          </div>
                          <div className="truncate text-xs text-text-secondary mt-0.5">{t.artist}</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setPlaylistModalTrack(t)}
                        className="text-text-secondary/60 hover:text-champagne p-2 text-xs transition-colors"
                        title="Add to playlist"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Global Add-To-Playlist Modal */}
      <AddToPlaylistModal
        track={playlistModalTrack}
        isOpen={Boolean(playlistModalTrack)}
        onClose={() => setPlaylistModalTrack(null)}
      />

      <MusicPlayer />
    </div>
  )
}
