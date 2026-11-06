import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function TunnelWorld() {
  const group = useRef<THREE.Group>(null)
  const rings = useRef<THREE.InstancedMesh>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)
  const count = 36
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const baseZ = useMemo(() => Array.from({ length: count }, (_, i) => -i * 1.1), [])

  useFrame((state) => {
    const a = analysisRef?.current
    const bass = (a?.bass ?? 0) * s.bassSensitivity
    const beat = (a?.beatStrength ?? 0) * s.beatIntensity
    const mid = (a?.mid ?? 0) * s.midSensitivity
    const treble = (a?.treble ?? 0) * s.trebleSensitivity
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.z = t * 0.06 + mid * 0.15
      group.current.position.z = (t * 1.2) % 1.1
    }
    if (rings.current) {
      for (let i = 0; i < count; i++) {
        const pulse = 1 + bass * 0.22 + (i % 4 === 0 ? beat * 0.35 : beat * 0.08)
        const wobble = 1 + Math.sin(t * 2 + i * 0.5) * mid * 0.06
        dummy.position.set(0, 0, baseZ[i])
        dummy.rotation.set(0, 0, i * 0.12 + treble * 0.3)
        dummy.scale.set(pulse * wobble, pulse * wobble, 1)
        dummy.updateMatrix()
        rings.current.setMatrixAt(i, dummy.matrix)
      }
      rings.current.instanceMatrix.needsUpdate = true
      const mat = rings.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.25 + beat * 1.1
    }
  })

  return (
    <group>
      <color attach="background" args={['#06070a']} />
      <fog attach="fog" args={['#06070a', 4, 26]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 2]} intensity={1.2} color="#C5A77A" />
      <pointLight position={[0, 0, -10]} intensity={0.8} color="#8090b0" />
      <group ref={group}>
        <instancedMesh ref={rings} args={[undefined, undefined, count]}>
          <torusGeometry args={[2.4, 0.045, 8, 6]} />
          <meshStandardMaterial color="#8a9098" metalness={0.95} roughness={0.22} emissive="#C5A77A" emissiveIntensity={0.25} />
        </instancedMesh>
      </group>
    </group>
  )
}
