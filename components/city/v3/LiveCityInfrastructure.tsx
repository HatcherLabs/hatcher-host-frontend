'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LIVE_CITY_BOUNDS, LIVE_CITY_ROADS } from './liveLayout';

const TERRAIN_SIZE = 820;
const CITY_CENTER_Z = LIVE_CITY_BOUNDS.centerZ;

export function LiveCityInfrastructure() {
  return (
    <group>
      <SkyDome />
      <Terrain />
      <MountainRing />
      <StreetGrid />
      <StreetLights />
      <TreeLine />
    </group>
  );
}

function SkyDome() {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color('#bdeff4') },
      horizonColor: { value: new THREE.Color('#78bfa5') },
      bottomColor: { value: new THREE.Color('#dff5ec') },
    }),
    [],
  );

  return (
    <mesh>
      <sphereGeometry args={[520, 36, 18]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            float sky = smoothstep(-0.18, 0.82, h);
            vec3 low = mix(bottomColor, horizonColor, smoothstep(-0.34, 0.08, h));
            vec3 color = mix(low, topColor, sky);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function Terrain() {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 86, 86);
    const positions = plane.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      const cityDx = Math.max(0, Math.abs(x) - LIVE_CITY_BOUNDS.width * 0.48);
      const cityDz = Math.max(
        0,
        Math.abs(z - CITY_CENTER_Z) - LIVE_CITY_BOUNDS.depth * 0.48,
      );
      const outsideCity = Math.min(1, Math.hypot(cityDx, cityDz) / 70);
      const ripple =
        Math.sin(x * 0.024 + z * 0.012) * 0.55 +
        Math.sin(z * 0.034 - x * 0.015) * 0.42;
      positions.setZ(i, outsideCity * ripple - 0.22);

      const shade = 0.5 + outsideCity * 0.12 + ripple * 0.02;
      color.setHSL(0.39, 0.42, shade);
      colors.push(color.r, color.g, color.b);
    }

    plane.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    plane.computeVertexNormals();
    return plane;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.16, CITY_CENTER_Z]}
      receiveShadow
    >
      <meshBasicMaterial vertexColors />
    </mesh>
  );
}

function StreetGrid() {
  return (
    <group>
      {LIVE_CITY_ROADS.map((road) => (
        <mesh
          key={road.key}
          position={[road.x, 0.032, road.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[road.width, road.depth]} />
          <meshStandardMaterial
            color="#17202c"
            roughness={0.86}
            metalness={0.04}
          />
        </mesh>
      ))}
      <LaneMarks />
    </group>
  );
}

function LaneMarks() {
  const marks = useMemo(() => {
    const out: Array<{
      key: string;
      x: number;
      z: number;
      width: number;
      depth: number;
    }> = [];

    for (const road of LIVE_CITY_ROADS) {
      const count = road.kind === 'vertical' ? 26 : 30;
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count - 0.5;
        if (road.kind === 'vertical') {
          out.push({
            key: `${road.key}-mark-${i}`,
            x: road.x,
            z: road.z + t * (road.depth - 18),
            width: 0.24,
            depth: 3.2,
          });
        } else {
          out.push({
            key: `${road.key}-mark-${i}`,
            x: road.x + t * (road.width - 18),
            z: road.z,
            width: 3.2,
            depth: 0.24,
          });
        }
      }
    }

    return out;
  }, []);

  return (
    <group>
      {marks.map((mark) => (
        <mesh
          key={mark.key}
          position={[mark.x, 0.045, mark.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[mark.width, mark.depth]} />
          <meshBasicMaterial color="#e6eedf" transparent opacity={0.42} />
        </mesh>
      ))}
    </group>
  );
}

function StreetLights() {
  const lampRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const obj = useMemo(() => new THREE.Object3D(), []);
  const lamps = useMemo(() => {
    const xs = LIVE_CITY_ROADS
      .filter((road) => road.kind === 'vertical')
      .map((road) => road.x);
    const zs = LIVE_CITY_ROADS
      .filter((road) => road.kind === 'horizontal')
      .map((road) => road.z);
    const out: Array<{ x: number; z: number; height: number }> = [];

    for (const x of xs) {
      for (const z of zs) {
        if ((Math.round((x + z) * 10) / 10) % 3 === 0) continue;
        out.push({
          x: x + (hashStr(`${x}:${z}:lamp-x`) - 0.5) * 1.2,
          z: z + (hashStr(`${x}:${z}:lamp-z`) - 0.5) * 1.2,
          height: 5.2 + hashStr(`${x}:${z}:lamp-h`) * 1.4,
        });
      }
    }
    return out;
  }, []);

  useEffect(() => {
    if (!lampRef.current || !glowRef.current) return;
    lamps.forEach((lamp, index) => {
      obj.position.set(lamp.x, lamp.height / 2, lamp.z);
      obj.scale.set(0.12, lamp.height, 0.12);
      obj.updateMatrix();
      lampRef.current!.setMatrixAt(index, obj.matrix);

      obj.position.set(lamp.x, lamp.height + 0.2, lamp.z);
      obj.scale.set(0.52, 0.52, 0.52);
      obj.updateMatrix();
      glowRef.current!.setMatrixAt(index, obj.matrix);
    });
    lampRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
  }, [lamps, obj]);

  return (
    <group>
      <instancedMesh
        ref={lampRef}
        args={[undefined, undefined, lamps.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#1c2731" roughness={0.72} metalness={0.12} />
      </instancedMesh>
      <instancedMesh ref={glowRef} args={[undefined, undefined, lamps.length]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial
          color="#f1d77a"
          emissive="#ffe38d"
          emissiveIntensity={0.46}
          roughness={0.38}
        />
      </instancedMesh>
    </group>
  );
}

function TreeLine() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => {
    const positions: Array<{ x: number; z: number; height: number }> = [];
    const cityHalfW = LIVE_CITY_BOUNDS.width / 2 + 28;
    const cityHalfD = LIVE_CITY_BOUNDS.depth / 2 + 24;

    for (let i = 0; i < 260; i++) {
      const side = i % 4;
      const t = hashStr(`tree-${i}:t`);
      const jitter = (hashStr(`tree-${i}:j`) - 0.5) * 18;
      let x = 0;
      let z = CITY_CENTER_Z;

      if (side === 0) {
        x = -cityHalfW - 14 - hashStr(`tree-${i}:x`) * 140;
        z += -cityHalfD + t * cityHalfD * 2 + jitter;
      } else if (side === 1) {
        x = cityHalfW + 14 + hashStr(`tree-${i}:x`) * 140;
        z += -cityHalfD + t * cityHalfD * 2 + jitter;
      } else if (side === 2) {
        x = -cityHalfW + t * cityHalfW * 2 + jitter;
        z += -cityHalfD - 16 - hashStr(`tree-${i}:z`) * 126;
      } else {
        x = -cityHalfW + t * cityHalfW * 2 - jitter;
        z += cityHalfD + 16 + hashStr(`tree-${i}:z`) * 126;
      }

      positions.push({
        x,
        z,
        height: 3.4 + hashStr(`tree-${i}:h`) * 3.1,
      });
    }

    return positions;
  }, []);
  const obj = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!trunkRef.current || !crownRef.current) return;

    trees.forEach((tree, index) => {
      obj.position.set(tree.x, tree.height * 0.22, tree.z);
      obj.scale.set(0.34, tree.height * 0.44, 0.34);
      obj.updateMatrix();
      trunkRef.current!.setMatrixAt(index, obj.matrix);

      obj.position.set(tree.x, tree.height * 0.76, tree.z);
      obj.scale.set(tree.height * 0.28, tree.height * 0.5, tree.height * 0.28);
      obj.updateMatrix();
      crownRef.current!.setMatrixAt(index, obj.matrix);
    });

    trunkRef.current.instanceMatrix.needsUpdate = true;
    crownRef.current.instanceMatrix.needsUpdate = true;
  }, [obj, trees]);

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#5a412c" roughness={0.92} />
      </instancedMesh>
      <instancedMesh
        ref={crownRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#145b3a" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function MountainRing() {
  const mountains = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => {
        const angle = (index / 30) * Math.PI * 2;
        const radius = 360 + hashStr(`mountain-${index}:r`) * 96;
        return {
          key: `mountain-${index}`,
          x: Math.cos(angle) * radius,
          z: CITY_CENTER_Z + Math.sin(angle) * radius,
          radius: 18 + hashStr(`mountain-${index}:w`) * 26,
          height: 14 + hashStr(`mountain-${index}:h`) * 22,
          rotation: angle + Math.PI,
        };
      }),
    [],
  );

  return (
    <group>
      {mountains.map((mountain) => (
        <mesh
          key={mountain.key}
          position={[mountain.x, mountain.height / 2 - 2.5, mountain.z]}
          rotation={[0, mountain.rotation, 0]}
          receiveShadow
        >
          <coneGeometry args={[mountain.radius, mountain.height, 5]} />
          <meshLambertMaterial color="#2f664b" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}
