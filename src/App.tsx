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

export default function App() {
  const location = useLocation()
  const setTracks = useStore((s) => s.setTracks)
  const queue = useStore((s) => s.queue)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    // Clean migration: replace broken soundhelix tracks if present or initialize queue
    const hasBroken = queue.some((t) => t.src.includes('soundhelix.com'))
    if (queue.length === 0 || hasBroken) {
      setTracks(demoTracks)
      useStore.setState({ queue: demoTracks, currentIndex: 0 })
    }
  }, [queue, setTracks])

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
