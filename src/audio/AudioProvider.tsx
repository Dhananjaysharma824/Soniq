import { useEffect, useRef, type ReactNode } from 'react'
import { audioEngine } from './AudioEngine'
import { useStore } from '@/store/useStore'

export default function AudioProvider({ children }: { children: ReactNode }) {
  const setAnalysisRef = useStore((s) => s.setAnalysisRef)
  const analysisRef = useRef(audioEngine.analysis)
  const inited = useRef(false)

  useEffect(() => {
    setAnalysisRef(analysisRef)
  }, [setAnalysisRef])

  useEffect(() => {
    const initEngine = async () => {
      if (inited.current) return
      inited.current = true
      await audioEngine.init()
      audioEngine.setVolume(useStore.getState().volume)
    }

    // Initialize audio element
    initEngine().catch(() => {})

    const unlockOnGesture = async () => {
      await audioEngine.resume()
      window.removeEventListener('pointerdown', unlockOnGesture)
      window.removeEventListener('keydown', unlockOnGesture)
    }

    window.addEventListener('pointerdown', unlockOnGesture, { once: true })
    window.addEventListener('keydown', unlockOnGesture, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture)
      window.removeEventListener('keydown', unlockOnGesture)
    }
  }, [])

  return <>{children}</>
}
