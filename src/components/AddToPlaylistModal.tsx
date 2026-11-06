import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore, type Track } from '@/store/useStore'

interface AddToPlaylistModalProps {
  track: Track | null
  isOpen: boolean
  onClose: () => void
}

export default function AddToPlaylistModal({ track, isOpen, onClose }: AddToPlaylistModalProps) {
  const playlists = useStore((s) => s.playlists)
  const createPlaylist = useStore((s) => s.createPlaylist)
  const addTrackToPlaylist = useStore((s) => s.addTrackToPlaylist)
  const removeTrackFromPlaylist = useStore((s) => s.removeTrackFromPlaylist)

  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!isOpen || !track) return null

  const handleToggleTrack = (playlistId: string, playlistName: string) => {
    const pl = playlists.find((p) => p.id === playlistId)
    if (!pl) return

    const alreadyIn = pl.trackIds.includes(track.id)
    if (alreadyIn) {
      removeTrackFromPlaylist(playlistId, track.id)
      setFeedback(`Removed from "${playlistName}"`)
    } else {
      addTrackToPlaylist(playlistId, track)
      setFeedback(`Added to "${playlistName}"`)
    }

    setTimeout(() => setFeedback(null), 2500)
  }

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newPlaylistName.trim()
    if (!name) return

    const newPl = createPlaylist(name)
    addTrackToPlaylist(newPl.id, track)
    setNewPlaylistName('')
    setShowCreateInput(false)
    setFeedback(`Created "${name}" & added track!`)
    setTimeout(() => setFeedback(null), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-bg-secondary/95 p-5 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-champagne animate-pulse" />
            <h3 className="font-display text-sm font-semibold text-text-primary tracking-wide">
              Add to Playlist
            </h3>
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

        {/* Selected Track Pill */}
        <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-white/[0.05] bg-bg-primary/50 p-2.5">
          <img
            src={track.artwork || ''}
            alt=""
            className="h-10 w-10 rounded-lg object-cover bg-surface flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-text-primary">{track.title}</div>
            <div className="truncate text-[10px] text-text-secondary mt-0.5">{track.artist}</div>
          </div>
        </div>

        {/* Notification Feedback */}
        {feedback && (
          <div className="mt-2 text-center text-xs font-mono text-champagne bg-champagne/10 border border-champagne/30 rounded-lg py-1 animate-in fade-in">
            {feedback}
          </div>
        )}

        {/* Existing Playlists List */}
        <div className="mt-3.5 max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {playlists.map((pl) => {
            const hasTrack = pl.trackIds.includes(track.id)
            return (
              <button
                key={pl.id}
                onClick={() => handleToggleTrack(pl.id, pl.name)}
                className={clsx(
                  'w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all',
                  hasTrack
                    ? 'border border-champagne/40 bg-champagne/10 text-champagne'
                    : 'border border-white/[0.04] bg-surface/50 text-text-secondary hover:text-text-primary hover:bg-surface/90',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{pl.name}</div>
                  <div className="font-mono text-[9px] text-text-secondary/70">
                    {pl.trackIds.length} {pl.trackIds.length === 1 ? 'song' : 'songs'}
                  </div>
                </div>

                <div className="flex-shrink-0 ml-2">
                  {hasTrack ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-champagne text-bg-primary text-[11px] font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-text-secondary text-xs hover:border-champagne hover:text-champagne">
                      +
                    </span>
                  )}
                </div>
              </button>
            )
          })}

          {playlists.length === 0 && !showCreateInput && (
            <div className="text-center py-6 text-xs text-text-secondary">
              No playlists found. Create your first playlist below!
            </div>
          )}
        </div>

        {/* Create New Playlist Section */}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          {showCreateInput ? (
            <form onSubmit={handleCreateAndAdd} className="space-y-2">
              <input
                type="text"
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name (e.g. Late Night Vibes)..."
                className="w-full rounded-xl border border-white/[0.1] bg-bg-primary/90 px-3.5 py-2 text-xs text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-champagne"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInput(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="rounded-lg bg-text-primary px-4 py-1.5 font-display text-xs font-semibold text-bg-primary hover:bg-white disabled:opacity-40 transition-all"
                >
                  Create & Add
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateInput(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.15] py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-champagne/50 hover:bg-white/[0.02] transition-all"
            >
              <span>+ Create New Playlist</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
