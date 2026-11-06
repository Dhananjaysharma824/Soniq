import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

function GlassSculptures() {
  const group = useRef<THREE.Group>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)
  const meshes = useRef<(THREE.Mesh | null)[]>([])

  const items = useMemo(() => [
    { pos: [-2.8, 0.2, -1.5], scale: 0.65, geo: 'ico' as const },
    { pos: [2.6, -0.4, -2], scale: 0.5, geo: 'oct' as const },
    { pos: [0.5, 1.6, -2.8], scale: 0.38, geo: 'torus' as const },
    { pos: [-1.2, -1.2, -1.8], scale: 0.32, geo: 'ico' as const },
    { pos: [3.2, 1.1, -3], scale: 0.28, geo: 'oct' as const },
  ], [])

  useFrame((state) => {
    const a = analysisRef?.current
    const bass = (a?.bass ?? 0) * s.bassSensitivity
    const beat = (a?.beatStrength ?? 0) * s.beatIntensity
    const mid = (a?.mid ?? 0) * s.midSensitivity
    const t = state.clock.elapsedTime

    if (group.current) group.current.rotation.y = t * 0.03
    meshes.current.forEach((m, i) => {
      if (!m) return
      const base = items[i].scale
      m.scale.setScalar(base * (1 + bass * 0.25 + beat * 0.15))
      m.rotation.x = t * (0.15 + i * 0.05) + mid * 0.3
      m.rotation.y = t * (0.12 + i * 0.04)
      const mat = m.material as THREE.MeshPhysicalMaterial
      mat.emissiveIntensity = 0.05 + beat * 0.4
    })
  })

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={it.pos as [number, number, number]}
          ref={(el) => { meshes.current[i] = el }}
        >
          {it.geo === 'ico' && <icosahedronGeometry args={[1, 1]} />}
          {it.geo === 'oct' && <octahedronGeometry args={[1, 0]} />}
          {it.geo === 'torus' && <torusKnotGeometry args={[0.7, 0.2, 80, 16]} />}
          <meshPhysicalMaterial
            color="#EAE7E1"
            metalness={0.1}
            roughness={0.08}
            transmission={0.94}
            thickness={1.6}
            ior={1.48}
            transparent
            opacity={0.75}
            emissive="#C5A875"
            emissiveIntensity={0.05}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
      ))}
    </group>
  )
}

export default function DreamWorld() {
  const haze = useRef<THREE.Mesh>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)

  useFrame((state) => {
    if (!haze.current) return
    const a = analysisRef?.current
    const mid = (a?.mid ?? 0) * s.midSensitivity
    ;(haze.current.material as THREE.MeshBasicMaterial).opacity = 0.02 + mid * 0.05
    haze.current.rotation.z = state.clock.elapsedTime * 0.01
  })

  return (
    <group>
      <color attach="background" args={['#09090C']} />
      <fog attach="fog" args={['#09090C', 8, 28]} />
      <ambientLight intensity={0.18} color="#D8D5D0" />
      <directionalLight position={[4, 5, 3]} intensity={1.0} color="#F3F1EC" />
      <pointLight position={[-3, -1, 2]} intensity={0.6} color="#C5A875" />
      <GlassSculptures />
      <mesh ref={haze} position={[0, 0, -12]} scale={20}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1A1820" transparent opacity={0.03} depthWrite={false} />
      </mesh>
    </group>
  )
}
