import { useMemo, useRef } from 'react'
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
  varying float vDist;

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

    // Multi-frequency directional ridge noise for sharp spikes
    float n1 = snoise(norm * 4.2 + vec3(uTime * 0.18));
    float n2 = snoise(norm * 8.5 - vec3(uTime * 0.28));
    float n3 = snoise(norm * 16.0 + vec3(uTime * 0.5));

    // Sharp inverted ridge noise: peaks form razor-sharp 3D needle spikes
    float ridge1 = pow(1.0 - abs(n1), 3.4);
    float ridge2 = pow(1.0 - abs(n2), 4.0) * 0.55;
    float spikePattern = ridge1 + ridge2;

    // Direct beat & bass impulse trigger!
    // Whenever the kick drum or bass hits, spikes shoot outward with immense punch!
    float beatSpike = spikePattern * (uBeat * 1.35 + uBass * 0.85);
    
    // High-frequency jitter across fine sand grains from vocals & treble
    float microSand = (n2 * 0.08 + n3 * 0.05) * (uMid + uTreble);
    
    // Ambient breathing
    float breathe = sin(uTime * 1.8 + aRandom * 6.28) * 0.015;

    float totalDisp = (beatSpike + microSand + breathe) * uDeform;
    pos += norm * totalDisp;

    // Tangential grain swirl on high beat moments
    float swirl = (uBeat * 0.35 + uBass * 0.18) * n1;
    pos.xz = mat2(cos(swirl), -sin(swirl), sin(swirl), cos(swirl)) * pos.xz;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Point size perspective attenuation:
    // Grains at spike peaks enlarge and become bright glowing stardust!
    float isTip = smoothstep(0.20, 0.65, totalDisp);
    float baseSize = aSize * (12.0 + isTip * 20.0 + uBeat * 14.0 + uBass * 6.0);
    gl_PointSize = (baseSize * uPixelRatio) / -mvPosition.z;
    gl_PointSize = clamp(gl_PointSize, 1.5, 36.0);

    // Color gradient based on displacement & audio energy
    // Core: Deep warm bronze-gold (#B89358)
    // Mid: Glowing Champagne (#E8D0A0)
    // Spike tips: Incandescent Stardust White (#FFF8E7)
    vec3 bronze = vec3(0.68, 0.52, 0.32);
    vec3 champagne = vec3(0.85, 0.74, 0.52);
    vec3 stardustTip = vec3(1.0, 0.98, 0.92);

    vec3 c = mix(bronze, champagne, clamp(uBass * 1.2, 0.0, 1.0));
    c = mix(c, stardustTip, isTip * (0.6 + uBeat * 0.4));

    vColor = c;
    vAlpha = clamp(0.55 + isTip * 0.45 + uBeat * 0.35 + aRandom * 0.15, 0.35, 1.0);
    vDist = totalDisp;
  }
`

const grainFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDist;

  void main() {
    // Make circular point sprites with soft feathered edge
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard;

    // Soft radial glow falloff
    float alpha = smoothstep(0.25, 0.02, distSq) * vAlpha;

    // Inner bright specular core
    float core = smoothstep(0.08, 0.0, distSq) * 0.6;
    vec3 finalColor = vColor + vec3(core);

    gl_FragColor = vec4(finalColor, alpha);
  }
`

export default function Sculpture({ scale = 1, position = [0, 0, 0] as [number, number, number] }) {
  const pointsRef = useRef<THREE.Points>(null)
  const settings = useStore((s) => s.settings)
  const { size, viewport } = useThree()

  // Dynamically adapt sphere scale to viewport so it never overwhelms mobile screens
  const responsiveScale = useMemo(() => {
    if (size.width < 480 || viewport.aspect < 0.65) {
      return scale * 0.65
    }
    if (size.width < 640 || viewport.aspect < 0.85) {
      return scale * 0.76
    }
    if (size.width < 768 || viewport.aspect < 1.0) {
      return scale * 0.86
    }
    if (size.width < 1024) {
      return scale * 0.94
    }
    return scale
  }, [size.width, viewport.aspect, scale])

  const smoothedBass = useRef(0)
  const smoothedBeat = useRef(0)
  const smoothedMid = useRef(0)
  const smoothedTreble = useRef(0)

  // Determine grain count based on quality setting
  const grainCount = useMemo(() => {
    switch (settings.quality) {
      case 'ultra':
        return 42000
      case 'high':
        return 32000
      case 'medium':
        return 24000
      case 'low':
      default:
        return 16000
    }
  }, [settings.quality])

  // Generate spherical point cloud with Fibonacci golden spiral distribution
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

      const x = Math.cos(theta) * Math.sin(phi)
      const y = Math.sin(theta) * Math.sin(phi)
      const z = Math.cos(phi)

      const jitter = 1.0 + (Math.random() - 0.5) * 0.05
      const r = baseRadius * jitter

      pos[i * 3] = x * r
      pos[i * 3 + 1] = y * r
      pos[i * 3 + 2] = z * r

      norm[i * 3] = x
      norm[i * 3 + 1] = y
      norm[i * 3 + 2] = z

      const isSpec = Math.random() < 0.08
      sz[i] = isSpec ? 1.6 + Math.random() * 0.8 : 0.8 + Math.random() * 0.6
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
      uDeform: { value: 1.25 },
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

    // Explosive attack for spikes (32.0) so spikes shoot out on the exact millisecond of the beat!
    // Rapid but smooth release (9.0) so spikes snap back with elastic tension
    const beatLerp = rawBeat > smoothedBeat.current ? 32.0 : 9.0
    smoothedBeat.current += (rawBeat - smoothedBeat.current) * Math.min(1.0, delta * beatLerp)

    const bassLerp = rawBass > smoothedBass.current ? 20.0 : 8.0
    smoothedBass.current += (rawBass - smoothedBass.current) * Math.min(1.0, delta * bassLerp)

    smoothedMid.current += (rawMid - smoothedMid.current) * Math.min(1.0, delta * 12.0)
    smoothedTreble.current += (rawTreble - smoothedTreble.current) * Math.min(1.0, delta * 12.0)

    uniforms.uTime.value += delta * (0.75 + smoothedBeat.current * 0.8) * motion
    uniforms.uBass.value = smoothedBass.current
    uniforms.uMid.value = smoothedMid.current
    uniforms.uTreble.value = smoothedTreble.current
    uniforms.uBeat.value = smoothedBeat.current
    uniforms.uDeform.value = s.deformation

    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.15 * motion
      pointsRef.current.rotation.x = Math.sin(uniforms.uTime.value * 0.25) * 0.04

      // Punchy sphere scale pump on kick drum
      const pulse = 1.0 + smoothedBeat.current * 0.18 + smoothedBass.current * 0.08
      pointsRef.current.scale.setScalar(responsiveScale * pulse)
    }
  })

  return (
    <points ref={pointsRef} position={position}>
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
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
