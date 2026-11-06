import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function CameraRig() {
  const { camera, pointer } = useThree()
  const analysisRef = useStore((s) => s.analysisRef)
  const settings = useStore((s) => s.settings)
  const base = useRef(new THREE.Vector3(0, 0, 5.2))

  useFrame((state) => {
    const a = analysisRef?.current
    const motion = settings.reducedMotion ? 0 : settings.cameraMotion
    const beat = (a?.beatStrength ?? 0) * settings.beatIntensity
    const bass = (a?.bass ?? 0) * settings.bassSensitivity
    const t = state.clock.elapsedTime

    // Smooth orbital parallax with subtle audio depth
    const targetX = pointer.x * 0.35 * motion + Math.sin(t * 0.12) * 0.05 * motion
    const targetY = pointer.y * 0.22 * motion + Math.cos(t * 0.10) * 0.04 * motion
    const targetZ = base.current.z - bass * 0.12 * motion - beat * 0.06 * motion

    camera.position.x += (targetX - camera.position.x) * 0.045
    camera.position.y += (targetY - camera.position.y) * 0.045
    camera.position.z += (targetZ - camera.position.z) * 0.06
    camera.lookAt(0, 0, 0)
  })

  return null
}
