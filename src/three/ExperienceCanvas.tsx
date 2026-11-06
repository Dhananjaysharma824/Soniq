import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import AudioBridge from './AudioBridge'
import Sculpture from './Sculpture'
import Particles from './Particles'
import CameraRig from './CameraRig'
import SpaceWorld from '@/worlds/SpaceWorld'
import OceanWorld from '@/worlds/OceanWorld'
import DreamWorld from '@/worlds/DreamWorld'
import TunnelWorld from '@/worlds/TunnelWorld'
import { useStore, type WorldId } from '@/store/useStore'

function World({ id }: { id: WorldId }) {
  switch (id) {
    case 'space': return <SpaceWorld />
    case 'ocean': return <OceanWorld />
    case 'dream': return <DreamWorld />
    case 'tunnel': return <TunnelWorld />
  }
}

export default function ExperienceCanvas() {
  const world = useStore((s) => s.world)
  const settings = useStore((s) => s.settings)

  const dpr: [number, number] = useMemo(() => {
    switch (settings.quality) {
      case 'low': return [1, 1]
      case 'medium': return [1, 1.25]
      case 'ultra': return [1, 2]
      default: return [1, 1.5]
    }
  }, [settings.quality])

  const particleColor = world === 'ocean' ? '#6ad0e8' : world === 'dream' ? '#c0a8e8' : world === 'tunnel' ? '#C5A77A' : '#9ab0d8'
  const showPost = settings.quality !== 'low'

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 5.2], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: settings.quality !== 'low', alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
        }}
      >
        <AudioBridge />
        <CameraRig />
        <Suspense fallback={null}>
          <World id={world} />
          <Sculpture />
          <Particles color={particleColor} />
          <Environment preset={world === 'ocean' ? 'city' : world === 'dream' ? 'dawn' : 'studio'} environmentIntensity={0.90} />
        </Suspense>
        {showPost && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.35} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
            <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0006)} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
            <Noise opacity={0.025} blendFunction={BlendFunction.SOFT_LIGHT} />
            <Vignette eskil={false} offset={0.15} darkness={0.65} />
          </EffectComposer>
        )}
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Canvas>
    </div>
  )
}
