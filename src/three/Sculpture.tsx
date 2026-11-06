import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

export default function Sculpture({ scale = 1, position = [0, 0, 0] as [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.MeshPhysicalMaterial>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const settings = useStore((s) => s.settings)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uBeat: { value: 0 },
      uDeform: { value: 1.2 },
    }),
    [],
  )

  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uTime = uniforms.uTime
      shader.uniforms.uBass = uniforms.uBass
      shader.uniforms.uMid = uniforms.uMid
      shader.uniforms.uTreble = uniforms.uTreble
      shader.uniforms.uBeat = uniforms.uBeat
      shader.uniforms.uDeform = uniforms.uDeform

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
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

         float getDisplacement(vec3 p, vec3 n) {
           // Smooth liquid-metal surface flow
           float slowFlow = snoise(n * 1.3 + vec3(uTime * 0.14, uTime * 0.10, uTime * 0.16)) * (0.05 + uBass * 0.04);
           float ripples = snoise(n * 2.6 - vec3(uTime * 0.25) + vec3(uMid * 0.8)) * (0.03 + uMid * 0.03);
           float microTwinkle = snoise(n * 5.0 + uTime * 0.4) * (uTreble * 0.02);

           // Gentle acoustic surface ripple (controlled, never stretches into wings)
           float surfaceRipple = sin(dot(n, vec3(0.0, 1.0, 0.0)) * 4.0 - uTime * 2.2) * (uBass * 0.04 + uBeat * 0.03);

           float rawDisp = (slowFlow + ripples + surfaceRipple + microTwinkle) * uDeform;
           return clamp(rawDisp, -0.15, 0.15);
         }
        `,
      )

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float d = getDisplacement(position, normal);
         transformed += normal * d;

         // Approximate displaced normal for realistic glistening highlights
         float eps = 0.02;
         vec3 tangent = normalize(cross(normal, vec3(0.0, 1.0, 0.0) + vec3(0.001)));
         vec3 bitangent = cross(normal, tangent);
         vec3 p1 = position + tangent * eps;
         vec3 p2 = position + bitangent * eps;
         float d1 = getDisplacement(p1, normalize(p1));
         float d2 = getDisplacement(p2, normalize(p2));
         vec3 v1 = (p1 + normalize(p1) * d1) - transformed;
         vec3 v2 = (p2 + normalize(p2) * d2) - transformed;
         vec3 displacedNormal = normalize(cross(v1, v2));
         #ifdef USE_NORMAL
           vNormal = normalize(normalMatrix * mix(normal, displacedNormal, 0.65));
         #endif
        `,
      )
    },
    [uniforms],
  )

  useFrame((state) => {
    const a = analysisRef?.current
    const s = settings
    const t = state.clock.elapsedTime
    const motion = s.reducedMotion ? 0 : 1

    const bass = (a?.bass ?? 0) * s.bassSensitivity
    const mid = (a?.mid ?? 0) * s.midSensitivity
    const treble = (a?.treble ?? 0) * s.trebleSensitivity
    const beat = (a?.beatStrength ?? 0) * s.beatIntensity

    uniforms.uTime.value = t
    uniforms.uBass.value = bass
    uniforms.uMid.value = mid
    uniforms.uTreble.value = treble
    uniforms.uBeat.value = beat
    uniforms.uDeform.value = s.deformation * 0.75

    if (mesh.current) {
      // Gentle, luxurious continuous rotation
      mesh.current.rotation.y = t * 0.06 * motion + mid * 0.05
      mesh.current.rotation.x = Math.sin(t * 0.08) * 0.08 * motion + bass * 0.04
      mesh.current.rotation.z = Math.cos(t * 0.06) * 0.05 * motion + beat * 0.03

      // Controlled organic breathing pulse (never explodes)
      const pulse = 1.0 + bass * 0.04 + beat * 0.03
      mesh.current.scale.setScalar(scale * pulse)
    }

    if (material.current) {
      // Subtle, refined metallic champagne sheen
      const glow = 0.02 + beat * 0.12 + bass * 0.05
      material.current.emissiveIntensity = glow
      material.current.roughness = 0.10
    }
  })

  const segments =
    settings.quality === 'ultra' || settings.quality === 'high' ? 128 : settings.quality === 'medium' ? 84 : 48

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[0.95, segments, segments]} />
      <meshPhysicalMaterial
        ref={material}
        color="#E4E0D9"
        metalness={0.98}
        roughness={0.10}
        clearcoat={1.0}
        clearcoatRoughness={0.06}
        reflectivity={1.0}
        envMapIntensity={2.2}
        emissive="#C5A875"
        emissiveIntensity={0.02}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
