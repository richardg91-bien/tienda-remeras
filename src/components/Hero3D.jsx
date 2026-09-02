/**
 * Escena 3D del Hero — vive en su propio chunk.
 * Solo se descarga cuando el Hero es visible (ver Hero.jsx),
 * así Three.js no bloquea la carga inicial de la tienda.
 */
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { TshirtModel } from "./designer/TshirtModel3D.jsx";

function HeroTshirt() {
  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
      <TshirtModel tshirtColor="#111111" designTexture={null} designTextureBack={null} />
    </Float>
  );
}

export default function Hero3D() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} className="rounded-3xl">
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#8b9dc3" />
      <pointLight position={[-5, -5, -5]} color="#00f2ff" intensity={0.6} />
      <Suspense fallback={null}>
        <HeroTshirt />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  );
}
