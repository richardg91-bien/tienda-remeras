import { Center, Decal, useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useRef } from "react";

export function TshirtModel({ tshirtColor, designTexture, designTextureBack, onViewChange }) {
  const { nodes, materials } = useGLTF("/3Dmodels/02.glb");
  const fallback     = "/3Dmodels/textures/design-fallback.png";
  const texture      = useTexture(designTexture     || fallback);
  const textureBack  = useTexture(designTextureBack || fallback);
  const meshRef      = useRef();

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material.color.set(tshirtColor);
    }
  }, [tshirtColor]);

  return (
    <Center position={[0, 0.1, 0]}>
      <group dispose={null}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          {/* Cuerpo base */}
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_1"].geometry} material={materials.Shirt} />

          {/* Frente con decal */}
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_2"].geometry} material={materials["front.001"]}>
            <meshBasicMaterial transparent opacity={0} />
            <Decal position={[0, 0.2, -0.31]} rotation={[-Math.PI / 2 - 0.05, 0, 0]}
              scale={[0.52, 0.7, 0.5]} onClick={() => onViewChange?.("front")}>
              <meshStandardMaterial map={texture} toneMapped={false} transparent
                polygonOffset polygonOffsetFactor={-1} />
            </Decal>
          </mesh>

          {/* Dorso con decal */}
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_3"].geometry} material={materials.back}>
            <meshBasicMaterial transparent opacity={0} />
            <Decal position={[0, -0.2, -0.27]} rotation={[Math.PI / 2 - 0.2, 0, Math.PI]}
              scale={[0.52, 0.7, 0.5]} onClick={() => onViewChange?.("back")}>
              <meshStandardMaterial map={textureBack} toneMapped={false} transparent
                polygonOffset polygonOffsetFactor={-1} />
            </Decal>
          </mesh>

          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_4"].geometry} material={materials["left hand"]} />
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_5"].geometry} material={materials["right hand"]} />
        </group>

        {/* Mesh de color base */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt001"].geometry} material={materials.background}
            ref={meshRef} />
        </group>
      </group>
    </Center>
  );
}

useGLTF.preload("/3Dmodels/02.glb");
