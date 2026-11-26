import { useTexture } from "@react-three/drei";

const FALLBACK_TEXTURE = "/3Dmodels/textures/design-fallback.png";

export default function UniversalProductModel({ model, designTexture, productColor }) {
  const texture = useTexture(designTexture || FALLBACK_TEXTURE);
  const id = `${model?.id || ""} ${model?.name || ""}`.toLowerCase();
  const materialColor = productColor || "#f8f8f5";
  const designMaterial = (
    <meshStandardMaterial
      map={texture}
      color={materialColor}
      transparent
      polygonOffset
      polygonOffsetFactor={-1}
    />
  );

  if (id.includes("plate") || id.includes("plato")) {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[0.95, 0.9, 0.12, 64]} />
          <meshStandardMaterial color={materialColor} />
        </mesh>
        <mesh position={[0, 0.066, 0]} receiveShadow>
          <circleGeometry args={[0.84, 64]} />
          {designMaterial}
        </mesh>
      </group>
    );
  }

  if (id.includes("cooler") || id.includes("conservadora")) {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.15, 1]} />
          {designMaterial}
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.56, 0.12, 1.06]} />
          <meshStandardMaterial color={materialColor} />
        </mesh>
      </group>
    );
  }

  if (id.includes("mug") || id.includes("taza") || id.includes("vaso") || id.includes("glass")) {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.68, 0.62, 1.35, 64, 1, true]} />
          {designMaterial}
        </mesh>
        <mesh position={[0.78, 0, 0.08]} castShadow receiveShadow>
          <torusGeometry args={[0.4, 0.09, 16, 48]} />
          <meshStandardMaterial color="#e2e4ed" />
        </mesh>
        <mesh position={[0, -0.68, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.08, 64]} />
          <meshStandardMaterial color={materialColor} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.78, 1.7, 64, 1, true]} />
        {designMaterial}
      </mesh>
      <mesh position={[0, 0.84, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.27, 0.32, 0.28, 48]} />
        <meshStandardMaterial color={materialColor} />
      </mesh>
      <mesh position={[0, 1.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 48]} />
        <meshStandardMaterial color="#9281d9" />
      </mesh>
    </group>
  );
}
