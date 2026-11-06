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
      {/* Distant background celestial atmosphere without any foreground obstructions */}
      <mesh ref={nebula} position={[0, 0, -25]}>
        <sphereGeometry args={[28, 32, 32]} />
        <meshBasicMaterial color="#1a284a" transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 4]} intensity={0.7} color="#f0f4ff" />
      <pointLight position={[-4, -2, 3]} intensity={0.5} color="#C5A875" />
    </group>
  )
}
