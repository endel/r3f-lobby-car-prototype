import { Clone, useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import { MeshStandardMaterial } from "three";
import { degToRad } from "three/src/math/MathUtils.js";

export const CAR_MODELS = [
  "sedanSports",
  "raceFuture",
  "taxi",
  "ambulance",
  "police",
  "truck",
  "firetruck",
];

interface CarProps {
  model?: string;
  [key: string]: any;
}

export const Car = ({ model = CAR_MODELS[0], ...props }: CarProps) => {
  const { scene } = useGLTF(`/models/cars/${model}.glb`);
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (child.material.name === "window") {
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
        if (
          child.material.name.startsWith("paint") ||
          child.material.name === "wheelInside"
        ) {
          child.material = new MeshStandardMaterial({
            color: child.material.color,
            metalness: 0.5,
            roughness: 0.1,
          });
        }
        if (child.material.name.startsWith("light")) {
          child.material.emissive = child.material.color;
          child.material.emissiveIntensity = 4;
          child.material.toneMapped = false;
        }
      }
    });
  }, [scene]);
  return (
    <group {...props}>
      <Clone
        object={scene}
        rotation-y={degToRad(180)}
        castShadow
      />
    </group>
  );
};

CAR_MODELS.forEach((model) => {
  useGLTF.preload(`/models/cars/${model}.glb`);
});
