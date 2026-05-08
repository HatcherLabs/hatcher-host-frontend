'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FRAMEWORK_COLORS } from '@/components/city/types';
import type { LiveRouteLayout } from './liveLayout';

export function LiveNetworkRoutes({ routes }: { routes: LiveRouteLayout[] }) {
  if (routes.length === 0) return null;
  return (
    <group>
      {routes.map((route) => (
        <LiveNetworkRoute key={route.key} route={route} />
      ))}
    </group>
  );
}

function LiveNetworkRoute({ route }: { route: LiveRouteLayout }) {
  const color = route.mine ? 0xffd24a : FRAMEWORK_COLORS[route.framework];
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(...route.from),
        new THREE.Vector3(...route.mid),
        new THREE.Vector3(...route.to),
      ]),
    [route.from, route.mid, route.to],
  );
  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 32, route.mine ? 0.055 : 0.035, 6, false),
    [curve, route.mine],
  );
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: route.mine ? 0.34 : 0.18,
        depthWrite: false,
        toneMapped: false,
      }),
    [color, route.mine],
  );
  const packet = useRef<THREE.Mesh>(null);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (!packet.current) return;
    const t = (route.phase + clock.getElapsedTime() * route.speed) % 1;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    packet.current.position.copy(point);
    packet.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  });

  return (
    <group>
      <mesh geometry={geometry} material={material} />
      <mesh ref={packet}>
        <boxGeometry args={[0.24, route.mine ? 2.4 : 1.8, 0.24]} />
        <meshBasicMaterial color={color} transparent opacity={0.92} toneMapped={false} />
      </mesh>
    </group>
  );
}
