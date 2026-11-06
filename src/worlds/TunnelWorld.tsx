import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

const RING_COUNT = 64
const TUNNEL_SPAN = 68
const RAIL_COUNT = 6
const TUNNEL_RADIUS = 2.75

function TunnelRings() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const settings = useStore((s) => s.settings)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const progress = useRef(0)
  const smoothedSpeed = useRef(8.0)

  // Color palette for regular vs accent rings
  const baseColor = useMemo(() => new THREE.Color('#383c48'), [])
  const accentColor = useMemo(() => new THREE.Color('#D4AF37'), [])
  const ringColors = useMemo(() => {
    const arr = new Float32Array(RING_COUNT * 3)
    for (let i = 0; i < RING_COUNT; i++) {
      const isAccent = i % 4 === 0
      const c = isAccent ? accentColor : baseColor
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    }
    return arr
  }, [accentColor, baseColor])

  useFrame((_state, delta) => {
    if (!mesh.current) return
    const a = audioEngine.analysis
    const s = settings
    const motion = s.reducedMotion ? 0.2 : 1.0

    const bass = (a.bass ?? 0) * s.bassSensitivity
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const mid = (a.mid ?? 0) * s.midSensitivity
    const treble = (a.treble ?? 0) * s.trebleSensitivity

    // Target flight speed: base cruising speed + punchy forward warp surge on kicks
    const targetSpeed = (7.5 + bass * 12.0 + beat * 22.0) * motion
    smoothedSpeed.current += (targetSpeed - smoothedSpeed.current) * Math.min(1.0, delta * 12.0)
    progress.current += smoothedSpeed.current * delta

    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.25 + beat * 0.95 + bass * 0.35

    const spacing = TUNNEL_SPAN / RING_COUNT

    for (let i = 0; i < RING_COUNT; i++) {
      // Endless seamless forward travel along Z towards camera
      const rawZ = (i * spacing + progress.current) % TUNNEL_SPAN
      const z = rawZ - (TUNNEL_SPAN - 7.0) // Travels from -61 to +7 (past camera at 5.2)

      const isAccent = i % 4 === 0

      // Dynamic audio shockwave expansion
      let scale = 1.0 + bass * 0.14 + (isAccent ? beat * 0.28 : beat * 0.08)

      // Smooth expansion as it passes camera to avoid hard clipping
      if (z > 3.8) {
        scale *= 1.0 + (z - 3.8) * 0.45
      }

      // Mesmerizing gentle spiral twist down the tunnel length
      const rotZ = i * 0.045 + Math.sin(progress.current * 0.08 + i * 0.03) * 0.25 + mid * 0.15

      dummy.position.set(0, 0, z)
      dummy.rotation.set(0, 0, rotZ)
      dummy.scale.set(scale, scale, 1.0)
      dummy.updateMatrix()

      mesh.current.setMatrixAt(i, dummy.matrix)
    }

    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, RING_COUNT]}>
      {/* Hexagonal torus profile with 3D tube thickness */}
      <torusGeometry args={[TUNNEL_RADIUS, 0.038, 8, 6]} />
      <meshStandardMaterial
        color="#8c93a0"
        metalness={0.92}
        roughness={0.18}
        emissive="#D4AF37"
        emissiveIntensity={0.25}
      >
        <instancedBufferAttribute attach="attributes-color" args={[ringColors, 3]} />
      </meshStandardMaterial>
    </instancedMesh>
  )
}

function TunnelRails() {
  const group = useRef<THREE.Group>(null)
  const settings = useStore((s) => s.settings)

  // 6 Longitudinal glowing guide rails running along the edges of the hexagon
  const rails = useMemo(() => {
    const list: { x: number; y: number; angle: number }[] = []
    for (let i = 0; i < RAIL_COUNT; i++) {
      const angle = (i * Math.PI * 2) / RAIL_COUNT
      list.push({
        x: Math.cos(angle) * TUNNEL_RADIUS,
        y: Math.sin(angle) * TUNNEL_RADIUS,
        angle,
      })
    }
    return list
  }, [])

  useFrame(() => {
    if (!group.current) return
    const a = audioEngine.analysis
    const s = settings
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const bass = (a.bass ?? 0) * s.bassSensitivity

    group.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.45 + beat * 0.45 + bass * 0.15
    })
  })

  return (
    <group ref={group}>
      {rails.map((rail, i) => (
        <mesh
          key={i}
          position={[rail.x, rail.y, -26.5]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.02, 0.02, TUNNEL_SPAN + 8, 6]} />
          <meshBasicMaterial color="#E5C178" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function WarpStreaks({ count = 260 }) {
  const ref = useRef<THREE.Points>(null)
  const settings = useStore((s) => s.settings)
  const progress = useRef(0)

  const streakData = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const bz = new Float32Array(count)
    const sp = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const rad = 0.9 + Math.random() * (TUNNEL_RADIUS - 0.95)
      const theta = Math.random() * Math.PI * 2
      const zInit = -60 + Math.random() * TUNNEL_SPAN

      bz[i] = zInit
      sp[i] = 1.0 + Math.random() * 1.5

      pos[i * 3] = Math.cos(theta) * rad
      pos[i * 3 + 1] = Math.sin(theta) * rad
      pos[i * 3 + 2] = zInit
    }
    return { positions: pos, baseZ: bz, speeds: sp }
  }, [count])

  useFrame((_state, delta) => {
    if (!ref.current) return
    const a = audioEngine.analysis
    const s = settings
    const motion = s.reducedMotion ? 0.2 : 1.0

    const bass = (a.bass ?? 0) * s.bassSensitivity
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const treble = (a.treble ?? 0) * s.trebleSensitivity

    const flySpeed = (12.0 + bass * 18.0 + beat * 30.0) * motion
    progress.current += flySpeed * delta

    const posAttr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const { baseZ, speeds } = streakData

    for (let i = 0; i < count; i++) {
      // Warp streaks rush forward along Z
      const rawZ = (baseZ[i] + progress.current * speeds[i]) % TUNNEL_SPAN
      const z = rawZ - (TUNNEL_SPAN - 7.0)

      arr[i * 3 + 2] = z
    }
    posAttr.needsUpdate = true

    const mat = ref.current.material as THREE.PointsMaterial
    mat.size = 0.045 + treble * 0.05 + beat * 0.04
    mat.opacity = 0.35 + beat * 0.45 + treble * 0.2
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[streakData.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#F0D399"
        size={0.045}
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function VanishingCore() {
  const mesh = useRef<THREE.Mesh>(null)
  const settings = useStore((s) => s.settings)

  useFrame(() => {
    if (!mesh.current) return
    const a = audioEngine.analysis
    const s = settings
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const bass = (a.bass ?? 0) * s.bassSensitivity

    const scale = 1.0 + beat * 0.45 + bass * 0.25
    mesh.current.scale.setScalar(scale)

    const mat = mesh.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.18 + beat * 0.35 + bass * 0.12
  })

  return (
    <mesh ref={mesh} position={[0, 0, -60]}>
      <sphereGeometry args={[2.5, 24, 24]} />
      <meshBasicMaterial
        color="#E5C178"
        transparent
        opacity={0.25}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export default function TunnelWorld() {
  return (
    <group>
      {/* Deep cosmic void backdrop with atmospheric depth fog */}
      <color attach="background" args={['#04060a']} />
      <fog attach="fog" args={['#04060a', 8, 65]} />

      {/* Balanced ambient & rim lighting for high-tech cyber tunnel */}
      <ambientLight intensity={0.22} />
      <pointLight position={[0, 0, 4]} intensity={0.9} color="#D4AF37" distance={16} />
      <pointLight position={[0, 0, -30]} intensity={1.5} color="#8ab0e0" distance={50} />
      <pointLight position={[0, 0, -58]} intensity={2.8} color="#E5C178" distance={45} />

      {/* Infinite travelling hexagonal tunnel rings */}
      <TunnelRings />

      {/* 6 glowing longitudinal guide rails defining perspective lines */}
      <TunnelRails />

      {/* Hyperspace warp speed streaks flying past the viewer */}
      <WarpStreaks />

      {/* Vanishing point radiant portal at deep end of tunnel */}
      <VanishingCore />
    </group>
  )
}
