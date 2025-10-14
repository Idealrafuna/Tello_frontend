import React, { Suspense, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Html, OrbitControls, Float } from "@react-three/drei";

const deg2rad = (d) => (d * Math.PI) / 180;
const MODEL_PATH = "/models/tello.glb";

function TelloModelWithGLTF({ roll = 0, pitch = 0, yaw = 0, altitude = 0 }) {
  const gltf = useGLTF(MODEL_PATH, true);
  const groupRef = React.useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    // Convert from degrees to radians and apply rotations
    const rx = pitch, ry = yaw, rz = roll; // Already in radians from App.js
    g.rotation.x += (rx - g.rotation.x) * 0.2;
    g.rotation.y += (ry - g.rotation.y) * 0.2;
    g.rotation.z += (rz - g.rotation.z) * 0.2;
    const yTarget = altitude * 0.05;
    g.position.y += (yTarget - g.position.y) * 0.2;
  });

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}

function TelloFallback({ roll = 0, pitch = 0, yaw = 0, altitude = 0 }) {
  const groupRef = React.useRef();
  useFrame(() => {
    if (!groupRef.current) return;
    const rx = pitch, ry = yaw, rz = roll; // Already in radians from App.js
    groupRef.current.rotation.x += (rx - groupRef.current.rotation.x) * 0.2;
    groupRef.current.rotation.y += (ry - groupRef.current.rotation.y) * 0.2;
    groupRef.current.rotation.z += (rz - groupRef.current.rotation.z) * 0.2;
    const yTarget = altitude * 0.05;
    groupRef.current.position.y += (yTarget - groupRef.current.position.y) * 0.2;
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
        <meshStandardMaterial />
      </mesh>
      {[-0.6, 0.6].map((x) =>
        [-0.6, 0.6].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0, z]}>
            <cylinderGeometry args={[0.05, 0.05, 0.15, 12]} />
            <meshStandardMaterial />
          </mesh>
        ))
      )}
    </group>
  );
}

function ModelOrFallback(props) {
  const [hasError, setHasError] = React.useState(false);
  
  // Try to use GLB directly, fallback if it fails
  try {
    if (hasError) {
      return <TelloFallback {...props} />;
    }
    return <TelloModelWithGLTF {...props} />;
  } catch (error) {
    setHasError(true);
    return <TelloFallback {...props} />;
  }
}

export default function ThreeDroneScene({ roll = 0, pitch = 0, yaw = 0, altitude = 0 }) {
  return (
    <Canvas shadows camera={{ position: [3, 2, 4], fov: 50 }}>
      <Suspense fallback={
        <Html center>
          <div style={{ padding: 12, background: "#111", color: "#fff", borderRadius: 8 }}>
            Loading model...
          </div>
        </Html>
      }>
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[5, 8, 5]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <Float floatIntensity={0.2} rotationIntensity={0.2}>
          <ModelOrFallback roll={roll} pitch={pitch} yaw={yaw} altitude={altitude} />
        </Float>
        <gridHelper args={[20, 20]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial />
        </mesh>
        <OrbitControls enableDamping dampingFactor={0.08} />
      </Suspense>
    </Canvas>
  );
}
