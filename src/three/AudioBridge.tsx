import { useFrame } from '@react-three/fiber'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

export default function AudioBridge() {
  const analysisRef = useStore((s) => s.analysisRef)
  useFrame(() => {
    if (!analysisRef) return
    audioEngine.update()
    // audioEngine.analysis is the same object; ref points to it
    analysisRef.current = audioEngine.analysis
  })
  return null
}

export function useAnalysis() {
  return useStore.getState().analysisRef
}
