import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar/Navbar'
import AudioProvider from '@/audio/AudioProvider'
import Home from '@/pages/Home/Home'
import Discover from '@/pages/Discover/Discover'
import Experience from '@/pages/Experience/Experience'
import Worlds from '@/pages/Worlds/Worlds'
import Library from '@/pages/Library/Library'
import Profile from '@/pages/Profile/Profile'
import { useStore } from '@/store/useStore'
import { demoTracks } from '@/data/demoTracks'
import { syncUserData } from '@/services/userSync'

export default function App() {
  const location = useLocation()
  const setTracks = useStore((s) => s.setTracks)
  const queue = useStore((s) => s.queue)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    // Initial sync of user playlists and favourites if logged in
    syncUserData().catch(() => {})
  }, [])

  useEffect(() => {
    // Purge any legacy demo tracks or broken soundhelix tracks from queue
    const demoIds = new Set(demoTracks.map((t) => t.id))
    const currentQueue = useStore.getState().queue
    const cleanQueue = currentQueue.filter(
      (t) => !demoIds.has(t.id) && !t.src?.includes('soundhelix.com') && !t.src?.includes('wikivky/musicplayer'),
    )
    if (cleanQueue.length !== currentQueue.length) {
      const nextIdx = cleanQueue.length > 0 ? Math.min(useStore.getState().currentIndex, cleanQueue.length - 1) : -1
      useStore.setState({
        queue: cleanQueue,
        currentIndex: nextIdx,
        isPlaying: cleanQueue.length > 0 ? useStore.getState().isPlaying : false,
      })
      try {
        const raw = localStorage.getItem('soniq-prefs')
        const prev = raw ? JSON.parse(raw) : {}
        localStorage.setItem('soniq-prefs', JSON.stringify({ ...prev, queue: cleanQueue, currentIndex: nextIdx }))
      } catch {}
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.quality = settings.quality
    document.documentElement.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false'
  }, [settings.quality, settings.reducedMotion])

  return (
    <AudioProvider>
      <div className="min-h-full bg-bg-primary text-text-primary">
        {/* Single global Navbar — handles all pages including Experience */}
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/experience" element={<Experience />} />
            <Route path="/worlds" element={<Worlds />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AnimatePresence>
      </div>
    </AudioProvider>
  )
}
