import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

const TUNNEL_LENGTH = 120
const TUNNEL_RADIUS = 3.6
const RIB_COUNT = 40

/**
 * Realistic Architectural Ribs & Bulkheads
 * Interlocking structural rings with metallic panels and recessed neon channels
 */
function ArchitecturalRibs() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const settings = useStore((s) => s.settings)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const progress = useRef(0)
  const smoothedSpeed = useRef(9.0)

  // Colors: Dark Carbon Frame + Glowing Champagne Accent Channels
  const ribColors = useMemo(() => {
    const arr = new Float32Array(RIB_COUNT * 3)
    const baseCol = new THREE.Color('#1c2028')
    const accentCol = new THREE.Color('#C5A875')

    for (let i = 0; i < RIB_COUNT; i++) {
      const isAccent = i % 3 === 0
      const c = isAccent ? accentCol : baseCol
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    }
    return arr
  }, [])

  useFrame((_state, delta) => {
    if (!mesh.current) return
    const a = audioEngine.analysis
    const s = settings
    const motion = s.reducedMotion ? 0.2 : 1.0

    const bass = (a.bass ?? 0) * s.bassSensitivity
    const beat = (a.beatStrength ?? 0) * s.beatIntensity

    // Music speed surges with kick drum momentum
    const targetSpeed = (9.0 + bass * 14.0 + beat * 26.0) * motion
    smoothedSpeed.current += (targetSpeed - smoothedSpeed.current) * Math.min(1.0, delta * 14.0)
    progress.current += smoothedSpeed.current * delta

    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.35 + beat * 1.2 + bass * 0.45

    const spacing = TUNNEL_LENGTH / RIB_COUNT

    for (let i = 0; i < RIB_COUNT; i++) {
      const rawZ = (i * spacing + progress.current) % TUNNEL_LENGTH
      const z = rawZ - (TUNNEL_LENGTH - 8.0) // Travels towards camera past viewer

      const isAccent = i % 3 === 0
      let expansion = 1.0 + (isAccent ? beat * 0.18 : bass * 0.08)

      // Smooth expansion as it passes behind camera
      if (z > 4.0) {
        expansion *= 1.0 + (z - 4.0) * 0.4
      }

      dummy.position.set(0, 0, z)
      dummy.rotation.set(0, 0, (i * Math.PI) / 6)
      dummy.scale.set(expansion, expansion, 1.0)
      dummy.updateMatrix()

      mesh.current.setMatrixAt(i, dummy.matrix)
    }

    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, RIB_COUNT]}>
      {/* Hexagonal-octagonal architectural bulkhead ring */}
      <torusGeometry args={[TUNNEL_RADIUS, 0.09, 16, 48]} />
      <meshStandardMaterial
        color="#2a303c"
        metalness={0.92}
        roughness={0.24}
        emissive="#C5A875"
        emissiveIntensity={0.3}
      >
        <instancedBufferAttribute attach="attributes-color" args={[ribColors, 3]} />
      </meshStandardMaterial>
    </instancedMesh>
  )
}

/**
 * Continuous Outer Cylindrical Tunnel Wall with Realistic Brushed Metallic Shading
 */
function TunnelCylinder() {
  const mesh = useRef<THREE.Mesh>(null)
  const settings = useStore((s) => s.settings)

  useFrame((_state, delta) => {
    if (!mesh.current) return
    const a = audioEngine.analysis
    const s = settings
    const motion = s.reducedMotion ? 0.2 : 1.0
    const bass = (a.bass ?? 0) * s.bassSensitivity
    const beat = (a.beatStrength ?? 0) * s.beatIntensity

    // Continuous slow roll for realism
    mesh.current.rotation.z += delta * 0.02 * motion

    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.08 + beat * 0.35 + bass * 0.15
  })

  return (
    <mesh ref={mesh} position={[0, 0, -45]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Inside-facing cylinder for realistic tunnel envelope */}
      <cylinderGeometry args={[TUNNEL_RADIUS * 1.08, TUNNEL_RADIUS * 1.08, TUNNEL_LENGTH * 1.2, 48, 1, true]} />
      <meshStandardMaterial
        color="#0d1117"
        side={THREE.BackSide}
        metalness={0.88}
        roughness={0.32}
        emissive="#1a2233"
        emissiveIntensity={0.1}
      />
    </mesh>
  )
}

/**
 * Longitudinal High-Speed Neon Guide Rails (Top, Bottom, Left, Right)
 * Surges with light waves running down the z-axis
 */
function NeonLightRails() {
  const linesRef = useRef<THREE.LineSegments>(null)
  const settings = useStore((s) => s.settings)

  const lineGeo = useMemo(() => {
    const pts: number[] = []
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    const r = TUNNEL_RADIUS * 1.03

    for (const ang of angles) {
      const x = Math.cos(ang) * r
      const y = Math.sin(ang) * r
      // Longitudinal guide rail extending from -100 to +10 along Z
      pts.push(x, y, -100, x, y, 10)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }, [])

  useFrame(() => {
    if (!linesRef.current) return
    const a = audioEngine.analysis
    const s = settings
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const bass = (a.bass ?? 0) * s.bassSensitivity

    const mat = linesRef.current.material as THREE.LineBasicMaterial
    mat.opacity = 0.45 + beat * 0.55 + bass * 0.25
  })

  return (
    <lineSegments ref={linesRef} geometry={lineGeo}>
      <lineBasicMaterial
        color="#E0B854"
        transparent
        opacity={0.65}
        linewidth={2}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}

/**
 * Reflective Highway Floor Runway
 * Grounded physical plane reflecting the grains sphere & lights
 */
function ReflectiveRunway() {
  const mesh = useRef<THREE.Mesh>(null)
  const settings = useStore((s) => s.settings)

  useFrame(() => {
    if (!mesh.current) return
    const a = audioEngine.analysis
    const s = settings
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const bass = (a.bass ?? 0) * s.bassSensitivity

    const mat = mesh.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.05 + beat * 0.25 + bass * 0.1
  })

  return (
    <mesh
      ref={mesh}
      position={[0, -TUNNEL_RADIUS * 0.72, -45]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[TUNNEL_RADIUS * 1.4, TUNNEL_LENGTH * 1.2]} />
      <meshStandardMaterial
        color="#080c12"
        metalness={0.96}
        roughness={0.16}
        emissive="#0d1828"
        emissiveIntensity={0.08}
      />
    </mesh>
  )
}

/**
 * Atmospheric Warp Light Streaks flying past viewer
 */
function WarpSpeedDust({ count = 280 }) {
  const ref = useRef<THREE.Points>(null)
  const settings = useStore((s) => s.settings)
  const progress = useRef(0)

  const dustData = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const bz = new Float32Array(count)
    const sp = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const rad = 0.8 + Math.random() * (TUNNEL_RADIUS - 1.0)
      const theta = Math.random() * Math.PI * 2
      const zInit = -90 + Math.random() * TUNNEL_LENGTH

      bz[i] = zInit
      sp[i] = 1.0 + Math.random() * 1.8

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

    const flySpeed = (14.0 + bass * 20.0 + beat * 35.0) * motion
    progress.current += flySpeed * delta

    const posAttr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    const { baseZ, speeds } = dustData

    for (let i = 0; i < count; i++) {
      const rawZ = (baseZ[i] + progress.current * speeds[i]) % TUNNEL_LENGTH
      arr[i * 3 + 2] = rawZ - (TUNNEL_LENGTH - 8.0)
    }
    posAttr.needsUpdate = true

    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = 0.35 + beat * 0.45
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[dustData.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#F0D399"
        size={0.035}
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/**
 * Deep Horizon Radiant Core
 */
function DeepHorizonPortal() {
  const mesh = useRef<THREE.Mesh>(null)
  const settings = useStore((s) => s.settings)

  useFrame(() => {
    if (!mesh.current) return
    const a = audioEngine.analysis
    const s = settings
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const bass = (a.bass ?? 0) * s.bassSensitivity

    const scale = 1.0 + beat * 0.35 + bass * 0.2
    mesh.current.scale.setScalar(scale)

    const mat = mesh.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.25 + beat * 0.4 + bass * 0.15
  })

  return (
    <mesh ref={mesh} position={[0, 0, -85]}>
      <sphereGeometry args={[4.2, 32, 32]} />
      <meshBasicMaterial
        color="#E5C178"
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export default function TunnelWorld() {
  return (
    <group>
      {/* Deep cinematic atmospheric fog for realistic depth occlusion */}
      <color attach="background" args={['#030508']} />
      <fog attach="fog" args={['#030508', 6, 75]} />

      {/* Cinematic Architectural Lighting */}
      <ambientLight intensity={0.28} />
      {/* Left/Right rim lights highlighting the metallic bulkheads */}
      <pointLight position={[4.0, 1.5, -2.0]} intensity={1.2} color="#D4AF37" distance={25} />
      <pointLight position={[-4.0, 1.5, -2.0]} intensity={1.0} color="#7aa2dc" distance={25} />
      {/* Down-tunnel depth illumination */}
      <pointLight position={[0, 2.0, -32]} intensity={1.8} color="#7aa2dc" distance={55} />
      <pointLight position={[0, 0, -80]} intensity={3.5} color="#E5C178" distance={65} />

      {/* Realistic Cylindrical Tunnel Wall */}
      <TunnelCylinder />

      {/* Reflective Ground Runway */}
      <ReflectiveRunway />

      {/* Structural Metallic Ribs with Recessed Neon Channels */}
      <ArchitecturalRibs />

      {/* Longitudinal High-Speed Neon Guide Rails */}
      <NeonLightRails />

      {/* Atmospheric Speed Dust */}
      <WarpSpeedDust />

      {/* Distant Event Horizon Portal */}
      <DeepHorizonPortal />
    </group>
  )
}
