import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

function OceanSurface() {
  const mesh = useRef<THREE.Mesh>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)
  const base = useRef<Float32Array | null>(null)

  useFrame((state) => {
    if (!mesh.current) return
    const geom = mesh.current.geometry as THREE.PlaneGeometry
    const pos = geom.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    if (!base.current || base.current.length !== arr.length) base.current = arr.slice()
    const a = analysisRef?.current
    const bass = (a?.bass ?? 0) * s.bassSensitivity
    const mid = (a?.mid ?? 0) * s.midSensitivity
    const beat = (a?.beatStrength ?? 0) * s.beatIntensity
    const t = state.clock.elapsedTime

    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3
      const x = base.current[ix]
      const y = base.current[ix + 1]
      const wave = Math.sin(x * 0.6 + t * 0.8) * 0.16 + Math.cos(y * 0.8 + t * 0.6) * 0.12
      const audio = bass * 0.35 + Math.sin(x * 1.2 + t * 1.4) * mid * 0.18 + beat * 0.15
      arr[ix + 2] = base.current[ix + 2] + wave + audio
    }
    pos.needsUpdate = true
    geom.computeVertexNormals()
  })

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2.3, 0, 0]} position={[0, -1.8, -2]}>
      <planeGeometry args={[20, 20, 72, 72]} />
      <meshPhysicalMaterial
        color="#0c1822"
        metalness={0.2}
        roughness={0.12}
        transmission={0.65}
        thickness={1.4}
        transparent
        opacity={0.88}
        emissive="#06121a"
        emissiveIntensity={0.2}
        clearcoat={0.8}
        clearcoatRoughness={0.1}
      />
    </mesh>
  )
}

function Bubbles({ count = 180 }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const s = useStore((st) => st.settings)
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 10,
        y: -3 + Math.random() * 5,
        z: (Math.random() - 0.5) * 8 - 1,
        sp: 0.12 + Math.random() * 0.3,
        sc: 0.02 + Math.random() * 0.05,
      })),
    [count],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    if (!ref.current) return
    const a = analysisRef?.current
    const treble = (a?.treble ?? 0) * s.trebleSensitivity
    const beat = (a?.beatStrength ?? 0) * s.beatIntensity
    const t = state.clock.elapsedTime

    data.forEach((d, i) => {
      const y = ((d.y + t * d.sp * (1 + treble * 1.5) + 3) % 6) - 3
      dummy.position.set(d.x + Math.sin(t + d.x) * 0.08, y, d.z)
      dummy.scale.setScalar(d.sc * (1 + beat * 0.5 + treble * 0.3))
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshPhysicalMaterial
        color="#C8D4DE"
        roughness={0.1}
        transmission={0.85}
        thickness={0.5}
        transparent
        opacity={0.4}
        emissive="#C5A875"
        emissiveIntensity={0.1}
      />
    </instancedMesh>
  )
}

export default function OceanWorld() {
  return (
    <group>
      <color attach="background" args={['#040a10']} />
      <fog attach="fog" args={['#040a10', 6, 24]} />
      <ambientLight intensity={0.15} color="#8ab0c8" />
      <directionalLight position={[0, 6, 3]} intensity={1.1} color="#d4e8f2" />
      <pointLight position={[-4, 1, -2]} intensity={0.5} color="#C5A875" />
      <OceanSurface />
      <Bubbles />
    </group>
  )
}
