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

    const unlockOnGesture = () => {
      audioEngine.resume()
      const el = audioEngine.getAudioElement()
      if (el && el.muted && !useStore.getState().muted) {
        el.muted = false
      }
    }

    window.addEventListener('pointerdown', unlockOnGesture)
    window.addEventListener('click', unlockOnGesture)
    window.addEventListener('keydown', unlockOnGesture)
    window.addEventListener('touchstart', unlockOnGesture)
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture)
      window.removeEventListener('click', unlockOnGesture)
      window.removeEventListener('keydown', unlockOnGesture)
      window.removeEventListener('touchstart', unlockOnGesture)
    }
  }, [])

  return <>{children}</>
}
