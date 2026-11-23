import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

// Custom GLSL Shaders for the Audio-Reactive Spiked Grains Sphere
const grainVertexShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uBeat;
  uniform float uDeform;
  uniform float uPixelRatio;

  attribute float aSize;
  attribute float aRandom;
  attribute vec3 aNormal;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDisplacement;

  // 3D Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vec3 pos = position;
    vec3 norm = normalize(aNormal);

    // 1. POWERFUL AUDIO BEAT RADIAL EXPANSION:
    // On kick drum & bass transients, the grains sphere pushes vigorously outward!
    float beatExp = (uBeat * 0.58 + uBass * 0.32) * uDeform;

    // 2. Grain Dispersal / Particle Burst on Beat:
    // Individual grains scatter radially by varying amounts, creating an explosive burst of stardust!
    float grainBurst = aRandom * (uBeat * 0.42 + uBass * 0.20) * uDeform;

    // 3. Audio-Reactive Harmonic Surface Spikes:
    // Directional horns shooting outward along frequency peaks
    float n1 = snoise(norm * 3.6 + vec3(uTime * 0.22));
    float n2 = snoise(norm * 7.4 - vec3(uTime * 0.35));
    float spikeCurve = pow(max(0.0, n1), 2.0) * 1.25 + pow(max(0.0, n2), 2.6) * 0.70;
    float spikes = spikeCurve * (0.04 + uBeat * 0.90 + uBass * 0.60) * uDeform;

    // 4. Subtle baseline cosmic breathing (alive even when paused)
    float idleBreathe = sin(uTime * 1.8 + aRandom * 6.28) * 0.022;

    // 5. High-frequency micro-grain shimmer from treble & mids
    float grainRipple = sin(norm.y * 16.0 + uTime * 5.0) * cos(norm.x * 16.0 + uTime * 4.0) * (uTreble * 0.045 + uMid * 0.03);

    float totalDisp = beatExp + grainBurst + spikes + idleBreathe + grainRipple;
    pos += norm * totalDisp;

    // Tangential particle vortex swirl during high energy drops
    float swirl = (uBeat * 0.28 + uBass * 0.16) * n1 * length(pos.xy);
    pos.xz = mat2(cos(swirl), -sin(swirl), sin(swirl), cos(swirl)) * pos.xz;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 6. Distinct Sand Grain Point Sizing (Crisp granular separation, NOT a solid opaque wall!)
    float dispFactor = clamp(totalDisp * 1.4, 0.0, 1.0);
    float pSize = aSize * (2.8 + dispFactor * 2.4 + uBeat * 1.8);
    gl_PointSize = (pSize * uPixelRatio * 125.0) / -mvPosition.z;
    gl_PointSize = clamp(gl_PointSize, 1.4, 7.0);

    // 7. Rich Cosmic Sand Palette (Deep Bronze Body, Warm Golden Amber Grains, Incandescent Ivory Spikes)
    vec3 deepBronze = vec3(0.24, 0.16, 0.08);
    vec3 goldenSand = vec3(0.86, 0.68, 0.38);
    vec3 brightIvory = vec3(1.0, 0.98, 0.92);

    vec3 c = mix(deepBronze, goldenSand, 0.45 + aRandom * 0.55);
    c = mix(c, brightIvory, dispFactor * 0.75);

    vColor = c;
    vAlpha = clamp(0.55 + aRandom * 0.35 + dispFactor * 0.1, 0.35, 0.92);
    vDisplacement = totalDisp;
  }
`

const grainFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDisplacement;

  void main() {
    // Sharp circular sand grain point sprite
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard;

    // Crisp falloff so grains retain particle identity and don't blur into opaque soup
    float radial = smoothstep(0.25, 0.06, distSq);

    // Glistening grain nucleus
    float core = smoothstep(0.08, 0.0, distSq) * (0.35 + clamp(vDisplacement * 0.5, 0.0, 0.65));
    vec3 finalColor = vColor + vec3(core * 0.45);

    gl_FragColor = vec4(finalColor, radial * vAlpha);
  }
`

export default function Sculpture({ scale = 1, position = [0, 0, 0] as [number, number, number] }) {
  const pointsRef = useRef<THREE.Points>(null)
  const settings = useStore((s) => s.settings)
  const { size, viewport } = useThree()

  // Interactive touch and mouse drag rotation state
  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const rotationEuler = useRef({ x: 0, y: 0 })
  const rotationVelocity = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Ignore if user tapped on interactive UI buttons, links, search, or player
      const target = e.target as HTMLElement | null
      if (
        target?.closest('button, input, select, textarea, a, nav, [role="button"], .pointer-events-auto, [data-interactive="true"]')
      ) {
        return
      }

      isDragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
      rotationVelocity.current = { x: 0, y: 0 }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return

      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }

      // Smooth gesture sensitivity
      const sensitivity = 0.0055

      // Y-axis (horizontal drag rotates sphere sideways)
      rotationVelocity.current.y = dx * sensitivity
      // X-axis (vertical drag rotates sphere up/down)
      rotationVelocity.current.x = dy * sensitivity

      rotationEuler.current.y += rotationVelocity.current.y
      rotationEuler.current.x += rotationVelocity.current.x
      rotationEuler.current.x = Math.max(-1.3, Math.min(1.3, rotationEuler.current.x))
    }

    const handlePointerUp = () => {
      isDragging.current = false
    }

    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { passive: true })
    window.addEventListener('pointercancel', handlePointerUp, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [])

  // Responsive scale adapted to viewport
  const responsiveScale = useMemo(() => {
    if (size.width < 480 || viewport.aspect < 0.65) {
      return scale * 0.68
    }
    if (size.width < 640 || viewport.aspect < 0.85) {
      return scale * 0.76
    }
    if (size.width < 768 || viewport.aspect < 1.0) {
      return scale * 0.84
    }
    if (size.width < 1024) {
      return scale * 0.92
    }
    return scale
  }, [size.width, viewport.aspect, scale])

  // Responsive position: lift slightly on mobile screens so it clears the bottom player bar
  const responsivePosition = useMemo((): [number, number, number] => {
    if (size.width < 640 || viewport.aspect < 0.75) {
      return [position[0], position[1] + 0.28, position[2]]
    }
    return position
  }, [size.width, viewport.aspect, position])

  const smoothedBass = useRef(0)
  const smoothedBeat = useRef(0)
  const smoothedMid = useRef(0)
  const smoothedTreble = useRef(0)

  // Grain density calibrated for crisp granular visibility (distinct particles, no solid white wall)
  const grainCount = useMemo(() => {
    switch (settings.quality) {
      case 'ultra':
        return 22000
      case 'high':
        return 16000
      case 'medium':
        return 12000
      case 'low':
      default:
        return 8000
    }
  }, [settings.quality])

  // Golden ratio Fibonacci distribution with volumetric grain depth
  const [positions, normals, sizes, randoms] = useMemo(() => {
    const pos = new Float32Array(grainCount * 3)
    const norm = new Float32Array(grainCount * 3)
    const sz = new Float32Array(grainCount)
    const rnd = new Float32Array(grainCount)

    const baseRadius = 0.95
    const goldenRatio = (1 + Math.sqrt(5)) / 2

    for (let i = 0; i < grainCount; i++) {
      const theta = 2 * Math.PI * i / goldenRatio
      const phi = Math.acos(1 - 2 * (i + 0.5) / grainCount)

      const nx = Math.cos(theta) * Math.sin(phi)
      const ny = Math.sin(theta) * Math.sin(phi)
      const nz = Math.cos(phi)

      // Volumetric grain thickness so particles have palpable 3D depth
      const shellThickness = (Math.random() - 0.5) * 0.10
      const r = baseRadius * (1.0 + shellThickness)

      pos[i * 3] = nx * r
      pos[i * 3 + 1] = ny * r
      pos[i * 3 + 2] = nz * r

      norm[i * 3] = nx
      norm[i * 3 + 1] = ny
      norm[i * 3 + 2] = nz

      const isGlitter = Math.random() < 0.16
      sz[i] = isGlitter ? 1.6 + Math.random() * 0.8 : 0.75 + Math.random() * 0.5
      rnd[i] = Math.random()
    }

    return [pos, norm, sz, rnd]
  }, [grainCount])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uBeat: { value: 0 },
      uDeform: { value: 1.35 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    [],
  )

  useFrame((_state, delta) => {
    const a = audioEngine.analysis
    const s = settings
    const motion = s.reducedMotion ? 0 : 1

    const rawBass = (a.bass ?? 0) * s.bassSensitivity
    const rawBeat = (a.beatStrength ?? 0) * s.beatIntensity
    const rawMid = (a.mid ?? 0) * s.midSensitivity
    const rawTreble = (a.treble ?? 0) * s.trebleSensitivity

    // Lightning-fast attack (35.0) for razor-sharp beat spikes
    // Smooth elastic spring release (9.0)
    const beatLerp = rawBeat > smoothedBeat.current ? 35.0 : 9.0
    smoothedBeat.current += (rawBeat - smoothedBeat.current) * Math.min(1.0, delta * beatLerp)

    const bassLerp = rawBass > smoothedBass.current ? 22.0 : 8.0
    smoothedBass.current += (rawBass - smoothedBass.current) * Math.min(1.0, delta * bassLerp)

    smoothedMid.current += (rawMid - smoothedMid.current) * Math.min(1.0, delta * 12.0)
    smoothedTreble.current += (rawTreble - smoothedTreble.current) * Math.min(1.0, delta * 12.0)

    uniforms.uTime.value += delta * (0.75 + smoothedBeat.current * 0.85) * motion
    uniforms.uBass.value = smoothedBass.current
    uniforms.uMid.value = smoothedMid.current
    uniforms.uTreble.value = smoothedTreble.current
    uniforms.uBeat.value = smoothedBeat.current
    uniforms.uDeform.value = s.deformation

    // 7. Interactive touch/cursor rotation with momentum & inertia decay
    if (!isDragging.current) {
      rotationEuler.current.y += rotationVelocity.current.y
      rotationEuler.current.x += rotationVelocity.current.x
      rotationVelocity.current.y *= 0.94
      rotationVelocity.current.x *= 0.94

      // Gentle continuous ambient cosmic rotation when not dragging
      rotationEuler.current.y += delta * 0.12 * motion
    }

    // Clamp pitch
    rotationEuler.current.x = Math.max(-1.3, Math.min(1.3, rotationEuler.current.x))

    if (pointsRef.current) {
      pointsRef.current.rotation.y = rotationEuler.current.y
      pointsRef.current.rotation.x = rotationEuler.current.x

      // Dramatic sphere scale expansion on beat (+50% to +80% surge on kick drums)
      const pulse = 1.0 + smoothedBeat.current * 0.52 + smoothedBass.current * 0.28
      pointsRef.current.scale.setScalar(responsiveScale * pulse)
    }
  })

  return (
    <points ref={pointsRef} position={responsivePosition}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aNormal"
          args={[normals, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          args={[randoms, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={grainVertexShader}
        fragmentShader={grainFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}
