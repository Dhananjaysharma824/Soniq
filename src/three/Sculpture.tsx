import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { audioEngine } from '@/audio/AudioEngine'
import { useStore } from '@/store/useStore'

export default function Sculpture({ scale = 1, position = [0, 0, 0] as [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.MeshPhysicalMaterial>(null)
  const settings = useStore((s) => s.settings)

  const phase = useRef(0)
  const smoothedBass = useRef(0)
  const smoothedBeat = useRef(0)
  const smoothedMid = useRef(0)

  const uniforms = useMemo(
    () => ({
      uPhase: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uBeat: { value: 0 },
      uDeform: { value: 1.1 },
    }),
    [],
  )

  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uPhase = uniforms.uPhase
      shader.uniforms.uBass = uniforms.uBass
      shader.uniforms.uMid = uniforms.uMid
      shader.uniforms.uTreble = uniforms.uTreble
      shader.uniforms.uBeat = uniforms.uBeat
      shader.uniforms.uDeform = uniforms.uDeform

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uPhase;
         uniform float uBass;
         uniform float uMid;
         uniform float uTreble;
         uniform float uBeat;
         uniform float uDeform;

         vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
         vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
         vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
         vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

         float snoise(vec3 v){
           const vec2 C=vec2(1.0/6.0,1.0/3.0);
           const vec4 D=vec4(0.0,0.5,1.0,2.0);
           vec3 i=floor(v+dot(v,C.yyy));
           vec3 x0=v-i+dot(i,C.xxx);
           vec3 g=step(x0.yzx,x0.xyz);
           vec3 l=1.0-g;
           vec3 i1=min(g.xyz,l.zxy);
           vec3 i2=max(g.xyz,l.zxy);
           vec3 x1=x0-i1+C.xxx;
           vec3 x2=x0-i2+C.yyy;
           vec3 x3=x0-D.yyy;
           i=mod289(i);
           vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
           float n_=0.142857142857;
           vec3 ns=n_*D.wyz-D.xzx;
           vec4 j=p-49.0*floor(p*ns.z*ns.z);
           vec4 x_=floor(j*ns.z);
           vec4 y_=floor(j-7.0*x_);
           vec4 x=x_*ns.x+ns.yyyy;
           vec4 y=y_*ns.x+ns.yyyy;
           vec4 h=1.0-abs(x)-abs(y);
           vec4 b0=vec4(x.xy,y.xy);
           vec4 b1=vec4(x.zw,y.zw);
           vec4 s0=floor(b0)*2.0+1.0;
           vec4 s1=floor(b1)*2.0+1.0;
           vec4 sh=-step(h,vec4(0.0));
           vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
           vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
           vec3 p0=vec3(a0.xy,h.x);
           vec3 p1=vec3(a0.zw,h.y);
           vec3 p2=vec3(a1.xy,h.z);
           vec3 p3=vec3(a1.zw,h.w);
           vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
           p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
           vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
           m=m*m;
           return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
         }

         vec3 getOrthogonal(vec3 v) {
           float x = abs(v.x);
           float y = abs(v.y);
           float z = abs(v.z);
           vec3 other = x < y ? (x < z ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0)) : (y < z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
           return normalize(cross(v, other));
         }

         float getDisplacement(vec3 n) {
           // 10 to 14 distinct standing wave spikes distributed across 3D sphere
           float n1 = snoise(n * 3.4);
           float spikes = pow(max(0.0, n1), 2.2);

           // Rhythmic audio drive: waves ONLY shoot out on the kick drum & bass hits!
           // In between beats, punch drops near 0 so the sphere is smooth and clean
           float punch = pow(uBeat, 1.4) * 0.52 + pow(uBass, 2.6) * 0.28;

           // Subtle musical ripple on mids
           float midRipple = snoise(n * 6.5) * 0.5 + 0.5;
           float midDetail = pow(midRipple, 2.0) * (uMid * 0.08);

           float totalDisp = (spikes * punch + midDetail) * uDeform;
           return clamp(totalDisp, 0.0, 0.60);
         }
        `,
      )

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float d = getDisplacement(normal);
         transformed += normal * d;

         // Singularity-free orthonormal tangent frame
         float eps = 0.015;
         vec3 t = getOrthogonal(normal);
         vec3 b = cross(normal, t);
         vec3 p1 = position + t * eps;
         vec3 p2 = position + b * eps;
         float d1 = getDisplacement(normalize(p1));
         float d2 = getDisplacement(normalize(p2));
         vec3 v0 = position + normal * d;
         vec3 v1 = (p1 + normalize(p1) * d1) - v0;
         vec3 v2 = (p2 + normalize(p2) * d2) - v0;
         vec3 displacedNormal = normalize(cross(v1, v2));
         #ifdef USE_NORMAL
           vNormal = normalize(normalMatrix * mix(normal, displacedNormal, 0.75));
         #endif
        `,
      )
    },
    [uniforms],
  )

  useFrame((_state, delta) => {
    // Direct, real-time access to audio analysis (zero React state delay)
    const a = audioEngine.analysis
    const s = settings
    const motion = s.reducedMotion ? 0 : 1

    const bass = (a.bass ?? 0) * s.bassSensitivity
    const beat = (a.beatStrength ?? 0) * s.beatIntensity
    const mid = (a.mid ?? 0) * s.midSensitivity
    const treble = (a.treble ?? 0) * s.trebleSensitivity

    phase.current += delta * motion

    uniforms.uPhase.value = phase.current
    uniforms.uBass.value = bass
    uniforms.uMid.value = mid
    uniforms.uTreble.value = treble
    uniforms.uBeat.value = beat
    uniforms.uDeform.value = s.deformation

    if (mesh.current) {
      // Smooth, majestic studio spin
      mesh.current.rotation.y += delta * 0.20 * motion
      mesh.current.rotation.x = Math.sin(phase.current * 0.4) * 0.05

      // Punchy kick drum scale expansion
      const pulse = 1.0 + beat * 0.16 + bass * 0.06
      mesh.current.scale.setScalar(scale * pulse)
    }

    if (material.current) {
      // Gentle champagne sheen on beat impact (never blowing out)
      const glow = 0.02 + beat * 0.25 + bass * 0.08
      material.current.emissiveIntensity = glow
      material.current.roughness = Math.max(0.18, 0.26 - beat * 0.08)
    }
  })

  const segments =
    settings.quality === 'ultra' || settings.quality === 'high' ? 128 : settings.quality === 'medium' ? 84 : 48

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[0.90, segments, segments]} />
      <meshPhysicalMaterial
        ref={material}
        color="#F2EFE9"
        metalness={0.88}
        roughness={0.22}
        clearcoat={0.5}
        clearcoatRoughness={0.20}
        reflectivity={0.8}
        envMapIntensity={1.0}
        emissive="#C5A875"
        emissiveIntensity={0.02}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
