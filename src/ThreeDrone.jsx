import React, { Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Html, OrbitControls, Float } from "@react-three/drei";

const deg2rad = (d) => (d * Math.PI) / 180;

// Create a wrapper component that handles GLTF loading errors
function TelloModelWrapper({ roll = 0, pitch = 0, yaw = 0, altitude = 0 }) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Check if the model file exists before trying to load it
    fetch("/models/tello.glb", { method: "HEAD" })
      .then(response => {
        if (!response.ok) {
          setHasError(true);
        }
      })
      .catch(() => {
        setHasError(true);
      });
  }, []);

  if (hasError) {
    return null; // Will use fallback
  }

  return <TelloModelWithGLTF roll={roll} pitch={pitch} yaw={yaw} altitude={altitude} />;
}

function TelloModelWithGLTF({ roll = 0, pitch = 0, yaw = 0, altitude = 0 }) {
  const gltf = useGLTF("/models/tello.glb", true);
  const groupRef = React.useRef();
  const rot = useMemo(() => ({
    x: deg2rad(pitch), y: deg2rad(yaw), z: deg2rad(roll)
  }), [roll, pitch, yaw]);

  useFrame(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;
    g.rotation.x += (rot.x - g.rotation.x) * 0.2;
    g.rotation.y += (rot.y - g.rotation.y) * 0.2;
    g.rotation.z += (rot.z - g.rotation.z) * 0.2;
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
    const rx = deg2rad(pitch), ry = deg2rad(yaw), rz = deg2rad(roll);
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
  const [useFallback, setUseFallback] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/models/tello.glb", { method: "HEAD" })
      .then((r) => { if (!cancelled) setUseFallback(!r.ok); })
      .catch(() => !cancelled && setUseFallback(true));
    return () => { cancelled = true; };
  }, []);
  if (useFallback) return <TelloFallback {...props} />;
  return <TelloModelWithGLTF {...props} />;
}

export default function ThreeDroneScene({ roll = 0, pitch = 0, yaw = 0, altitude = 0 }) {
  return (
    <Canvas shadows camera={{ position: [3, 2, 4], fov: 50 }}>
      <Suspense fallback={
        <Html center>
          <div style={{ padding: 12, background: "#111", color: "#fff", borderRadius: 8 }}>
            Loading model…
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
