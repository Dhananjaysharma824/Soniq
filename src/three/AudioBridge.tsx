import { useFrame } from '@react-three/fiber'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

export default function AudioBridge() {
  const analysisRef = useStore((s) => s.analysisRef)
  useFrame(() => {
    audioEngine.update()
    if (analysisRef && analysisRef.current) {
      analysisRef.current = audioEngine.analysis
    }
  })
  return null
}

export function useAnalysis() {
  return useStore.getState().analysisRef
}
