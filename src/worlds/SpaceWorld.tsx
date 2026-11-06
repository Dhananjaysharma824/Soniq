import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

function Stars({ count = 1200 }) {
  const ref = useRef<THREE.Points>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 18 + Math.random() * 30
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      a[i * 3] = r * Math.sin(ph) * Math.cos(th)
      a[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      a[i * 3 + 2] = r * Math.cos(ph)
    }
    return a
  }, [count])
  useFrame((state) => {
    if (!ref.current) return
    const a = analysisRef?.current
    const treble = (a?.treble ?? 0) * s.trebleSensitivity
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = 0.35 + treble * 0.5
    mat.size = 0.03 + treble * 0.04
    ref.current.rotation.y = state.clock.elapsedTime * 0.005
  })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial color="#cfd6e4" size={0.03} transparent opacity={0.4} depthWrite={false} />
    </points>
  )
}

function Planets() {
  const g1 = useRef<THREE.Group>(null)
  const g2 = useRef<THREE.Group>(null)
  const p1 = useRef<THREE.Mesh>(null)
  const p2 = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)
  useFrame((state) => {
    const a = analysisRef?.current
    const bass = (a?.bass ?? 0) * s.bassSensitivity
    const beat = (a?.beatStrength ?? 0) * s.beatIntensity
    const mid = (a?.mid ?? 0) * s.midSensitivity
    const t = state.clock.elapsedTime
    if (g1.current) g1.current.rotation.y = t * 0.12
    if (g2.current) g2.current.rotation.y = -t * 0.08 + 1.2
    if (p1.current) p1.current.scale.setScalar(0.55 + bass * 0.25 + beat * 0.12)
    if (p2.current) {
      p2.current.scale.setScalar(0.32 + bass * 0.15)
      p2.current.position.y = Math.sin(t * 0.7) * 0.15 + mid * 0.2
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.2
      const rm = ring.current.material as THREE.MeshStandardMaterial
      rm.emissiveIntensity = 0.2 + beat * 1.2
      ring.current.scale.setScalar(1 + beat * 0.08)
    }
  })
  return (
    <>
      <group ref={g1}>
        <mesh ref={p1} position={[3.8, 0.6, -1.5]}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial color="#4a5a78" metalness={0.7} roughness={0.35} emissive="#1a2540" emissiveIntensity={0.3} />
        </mesh>
        <mesh ref={ring} position={[3.8, 0.6, -1.5]} rotation={[Math.PI * 0.42, 0, 0]}>
          <torusGeometry args={[1.05, 0.025, 16, 100]} />
          <meshStandardMaterial color="#C5A77A" emissive="#C5A77A" emissiveIntensity={0.2} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      <group ref={g2}>
        <mesh ref={p2} position={[-3.2, -0.8, -2.5]}>
          <sphereGeometry args={[1, 40, 40]} />
          <meshStandardMaterial color="#6b4a3a" metalness={0.4} roughness={0.6} emissive="#2a1510" emissiveIntensity={0.2} />
        </mesh>
      </group>
    </>
  )
}

export default function SpaceWorld() {
  const nebula = useRef<THREE.Mesh>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)
  useFrame((state) => {
    if (!nebula.current) return
    const a = analysisRef?.current
    const mid = (a?.mid ?? 0) * s.midSensitivity
    const mat = nebula.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.06 + mid * 0.12
    nebula.current.rotation.z = state.clock.elapsedTime * 0.01
  })
  return (
    <group>
      <color attach="background" args={['#04060c']} />
      <fog attach="fog" args={['#04060c', 12, 45]} />
      <Stars />
      <Planets />
      {/* Atmospheric space nebula glow without square edges */}
      <mesh ref={nebula} position={[0, 0, -25]}>
        <sphereGeometry args={[28, 32, 32]} />
        <meshBasicMaterial color="#1a284a" transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <ambientLight intensity={0.18} />
      <pointLight position={[6, 4, 4]} intensity={1.2} color="#9bb4ff" />
      <pointLight position={[-5, -2, 3]} intensity={0.5} color="#C5A77A" />
    </group>
  )
}
