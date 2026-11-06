import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function Particles({ count: baseCount = 1800, radius = 8, color = '#BFC3CA' }) {
  const points = useRef<THREE.Points>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const settings = useStore((s) => s.settings)
  const count = Math.floor(
    baseCount *
      settings.particleDensity *
      (settings.quality === 'low' ? 0.35 : settings.quality === 'medium' ? 0.6 : 1),
  )

  const { positions, speeds, phases } = useMemo(() => {
    const n = Math.max(200, baseCount)
    const pos = new Float32Array(n * 3)
    const sp = new Float32Array(n)
    const ph = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = radius * (0.3 + Math.random() * 0.8)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
      sp[i] = 0.25 + Math.random() * 0.75
      ph[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: sp, phases: ph }
  }, [baseCount, radius])

  const drawCount = Math.min(count, positions.length / 3)

  useFrame((state) => {
    if (!points.current) return
    const a = analysisRef?.current
    const t = state.clock.elapsedTime
    const treble = (a?.treble ?? 0) * settings.trebleSensitivity
    const beat = (a?.beatStrength ?? 0) * settings.beatIntensity
    const bass = (a?.bass ?? 0) * settings.bassSensitivity
    const motion = settings.reducedMotion ? 0.05 : 1

    const geom = points.current.geometry
    const pos = geom.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const n = Math.min(drawCount, arr.length / 3)

    // Explosive audio shockwave breathing
    const breathe = 1 + bass * 0.32 + beat * 0.22
    const wobble = (0.05 + treble * 0.25) * motion

    for (let i = 0; i < n; i++) {
      const i3 = i * 3
      const ox = positions[i3]
      const oy = positions[i3 + 1]
      const oz = positions[i3 + 2]
      const sp = speeds[i]
      const ph = phases[i]

      arr[i3] = ox * breathe + Math.sin(t * sp + ph) * wobble
      arr[i3 + 1] = oy * breathe + Math.cos(t * sp * 0.9 + ph) * wobble
      arr[i3 + 2] = oz * breathe + Math.sin(t * sp * 1.1 + ph * 0.7) * wobble
    }
    pos.needsUpdate = true
    geom.setDrawRange(0, n)

    // Particle field rotation and twinkle
    points.current.rotation.y = t * 0.02 * motion + treble * 0.08
    const mat = points.current.material as THREE.PointsMaterial
    mat.opacity = 0.45 + treble * 0.4 + beat * 0.25
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.slice(), 3]} count={positions.length / 3} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={settings.quality === 'low' ? 0.03 : 0.02}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
