import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

const RING_COUNT = 72
const TUNNEL_SPAN = 72
const TUNNEL_RADIUS = 2.85

function CircularTunnelRings() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const settings = useStore((s) => s.settings)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const progress = useRef(0)
  const smoothedSpeed = useRef(8.0)

  // Color palette for regular vs accent golden rings
  const baseColor = useMemo(() => new THREE.Color('#323744'), [])
  const accentColor = useMemo(() => new THREE.Color('#E0B854'), [])
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

    // Cruising speed + instant music warp surge on kicks
    const targetSpeed = (8.0 + bass * 12.0 + beat * 22.0) * motion
    smoothedSpeed.current += (targetSpeed - smoothedSpeed.current) * Math.min(1.0, delta * 12.0)
    progress.current += smoothedSpeed.current * delta

    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.22 + beat * 0.95 + bass * 0.35

    const spacing = TUNNEL_SPAN / RING_COUNT

    for (let i = 0; i < RING_COUNT; i++) {
      // Seamless circular ring travel along Z towards camera
      const rawZ = (i * spacing + progress.current) % TUNNEL_SPAN
      const z = rawZ - (TUNNEL_SPAN - 7.0) // Travels from -65 to +7 (past camera at 5.2)

      const isAccent = i % 4 === 0

      // Audio-reactive circular expansion wave
      let scale = 1.0 + bass * 0.12 + (isAccent ? beat * 0.26 : beat * 0.07)

      // Smooth expansion as it passes behind camera to avoid clipping
      if (z > 3.8) {
        scale *= 1.0 + (z - 3.8) * 0.45
      }

      // Subtle hypnotic tilt that flows with mid frequencies
      const rotX = Math.sin(progress.current * 0.05 + i * 0.08) * (0.02 + mid * 0.03)
      const rotY = Math.cos(progress.current * 0.05 + i * 0.08) * (0.02 + mid * 0.03)

      dummy.position.set(0, 0, z)
      dummy.rotation.set(rotX, rotY, 0)
      dummy.scale.set(scale, scale, 1.0)
      dummy.updateMatrix()

      mesh.current.setMatrixAt(i, dummy.matrix)
    }

    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, RING_COUNT]}>
      {/* Pure, perfectly smooth round circular rings (72 tubular segments = 0 flat edges) */}
      <torusGeometry args={[TUNNEL_RADIUS, 0.032, 16, 72]} />
      <meshStandardMaterial
        color="#848b99"
        metalness={0.92}
        roughness={0.16}
        emissive="#D4AF37"
        emissiveIntensity={0.25}
      >
        <instancedBufferAttribute attach="attributes-color" args={[ringColors, 3]} />
      </meshStandardMaterial>
    </instancedMesh>
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
      const rawZ = (baseZ[i] + progress.current * speeds[i]) % TUNNEL_SPAN
      const z = rawZ - (TUNNEL_SPAN - 7.0)

      arr[i * 3 + 2] = z
    }
    posAttr.needsUpdate = true

    const mat = ref.current.material as THREE.PointsMaterial
    mat.size = 0.04 + treble * 0.05 + beat * 0.04
    mat.opacity = 0.35 + beat * 0.45 + treble * 0.2
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[streakData.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#F0D399"
        size={0.04}
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
      <sphereGeometry args={[2.5, 32, 32]} />
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

      {/* Rim back-lighting and atmospheric lighting without any front specular glare spots */}
      <ambientLight intensity={0.26} />
      <pointLight position={[5.0, 0, -2.0]} intensity={0.8} color="#D4AF37" distance={22} />
      <pointLight position={[-5.0, 0, -2.0]} intensity={0.7} color="#8ab0e0" distance={22} />
      <pointLight position={[0, 0, -30]} intensity={1.5} color="#8ab0e0" distance={50} />
      <pointLight position={[0, 0, -58]} intensity={2.8} color="#E5C178" distance={45} />

      {/* Infinite travelling pure circular round rings (clean, zero straight lines/rails) */}
      <CircularTunnelRings />

      {/* Hyperspace warp speed streaks flying past the viewer */}
      <WarpStreaks />

      {/* Vanishing point radiant portal at deep end of tunnel */}
      <VanishingCore />
    </group>
  )
}
