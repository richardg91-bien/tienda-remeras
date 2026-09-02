/**
 * Wrapper liviano del TshirtModel para usar en el Hero
 * sin cargar todo el sistema del Design Studio
 */
import { Center, useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";

export function TshirtModel({ tshirtColor = "#111111" }) {
  const { nodes, materials } = useGLTF("/3Dmodels/02.glb");
  const meshRef = useRef();

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material.color.set(tshirtColor);
    }
  }, [tshirtColor]);

  return (
    <Center position={[0, 0.1, 0]}>
      <group dispose={null}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_1"].geometry} material={materials.Shirt} />
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_2"].geometry} material={materials["front.001"]} />
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_3"].geometry} material={materials.back} />
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_4"].geometry} material={materials["left hand"]} />
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt_5"].geometry} material={materials["right hand"]} />
        </group>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh scale={7.5} position={[0, 0, 2]} castShadow receiveShadow
            geometry={nodes["T-Shirt001"].geometry}
            ref={meshRef}>
            <meshStandardMaterial color={tshirtColor} />
          </mesh>
        </group>
      </group>
    </Center>
  );
}

useGLTF.preload("/3Dmodels/02.glb");
