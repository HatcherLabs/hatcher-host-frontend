'use client';
import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedural cyber sky — replaces the flat `<color attach="background">`
 * with a vertical gradient (dark navy at the horizon → magenta-purple
 * mid-zenith → deep violet at the very top) plus a sparse pseudo-star
 * field generated entirely in the fragment shader.
 *
 * Why a custom shader instead of an HDRI background:
 *   - Our HDRI files (day.hdr / night.hdr) show real photographed
 *     skyscrapers at the horizon line that dwarf the 600u ground plane.
 *     Skybox.tsx keeps them as `background={false}` for that reason —
 *     they still feed PBR reflections on the city's metals/glass, which
 *     is exactly what we want.
 *   - drei's <Sky> uses Hosek-Wilkie atmospheric scattering — looks
 *     like a real-world daytime sky, not a neon cyberpunk one.
 *   - drei's <Stars> draws a starfield but doesn't fix the gradient
 *     behind it.
 *
 * The sky is a back-side sphere centered at the origin (large enough
 * to sit outside the camera's max OrbitControls distance of 300 + a
 * margin). depthWrite=false so it never wins z-tests against the city.
 */
export function CyberSky() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      // Render before everything else so geometry can occlude it.
      uniforms: {
        uHorizon: { value: new THREE.Color('#050418') }, // matches fog
        uMid:     { value: new THREE.Color('#1a0838') }, // deep violet
        uZenith:  { value: new THREE.Color('#2a0a4a') }, // purple-magenta
        uGlow:    { value: new THREE.Color('#7a3ad8') }, // soft glow band
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          // World-space direction from origin to this vertex on the
          // sky sphere. Normalized so we can index the gradient by
          // pure direction (independent of sphere radius).
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vWorldDir;
        uniform vec3 uHorizon;
        uniform vec3 uMid;
        uniform vec3 uZenith;
        uniform vec3 uGlow;

        // Cheap hash for procedural stars. Returns a deterministic
        // pseudo-random value in [0, 1) per direction.
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          // Vertical factor: 0 at horizon, 1 at zenith. We bias it so
          // the gradient transitions live in the upper half of the
          // dome, leaving a thin dark band at the horizon to blend
          // into the fog.
          float t = clamp(vWorldDir.y * 0.5 + 0.5, 0.0, 1.0);
          float horizonW = smoothstep(0.5, 0.0, t);
          float midW     = smoothstep(0.5, 0.85, t) * (1.0 - smoothstep(0.85, 1.0, t));
          float zenithW  = smoothstep(0.85, 1.0, t);

          vec3 col = uHorizon * horizonW + uMid * midW + uZenith * zenithW;

          // Glow band at the mid altitude — a soft purple ridge that
          // hints at distant city light bouncing off "smog".
          float glow = smoothstep(0.55, 0.7, t) * (1.0 - smoothstep(0.7, 0.88, t));
          col += uGlow * glow * 0.35;

          // Procedural stars — only render above ~30° altitude so we
          // never put stars over the horizon ring or the city skyline.
          if (vWorldDir.y > 0.3) {
            // Quantize direction to a coarse grid so stars stay put as
            // the camera rotates (no flicker from re-quantization).
            vec3 cell = floor(vWorldDir * 250.0);
            float h = hash(cell);
            // Star density: ~0.1% of cells become stars. Brighter ones
            // hit a second threshold and get extra punch.
            if (h > 0.999) {
              float bright = (h - 0.999) * 1000.0; // 0..1
              vec3 starCol = mix(vec3(0.7, 0.85, 1.0), vec3(0.95, 0.6, 1.0), bright);
              col += starCol * (0.6 + bright * 0.8);
            } else if (h > 0.997) {
              col += vec3(0.4, 0.5, 0.7) * 0.3;
            }
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  return (
    <mesh material={material} renderOrder={-1000}>
      <sphereGeometry args={[600, 32, 16]} />
    </mesh>
  );
}
