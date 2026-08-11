import { Html, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3, type Group } from "three";
import { getSource } from "@colyseus/react";
import { useRoom, usePredict } from "../colyseus";
import { Car } from "./Car";

/**
 * Renders one car — local or remote — through the ONE read idiom:
 * `predict.value(instance, field)`. Remote cars resolve to the lerp attach
 * (see Game.tsx); our own car resolves to the reconciler's predicted pose.
 * Motion never flows through React state: positions are written into the
 * group ref every frame, while name/car changes re-render at patch rate via
 * the snapshot prop.
 */
export const CarController = ({ player }: { player: any }) => {
  const group = useRef<Group>(null);
  const { room } = useRoom();
  const predict = usePredict();

  const isMe = player.sessionId === room!.sessionId;

  // The snapshot → decoded instance bridge: predict.value() keys off the
  // decoded schema instance, not the immutable snapshot.
  const source = getSource<any>(player);

  const lookAt = useRef(new Vector3(0, 0, 0));

  useFrame(({ camera }) => {
    if (!group.current || !predict || !source) return;

    group.current.position.set(
      predict.value(source, "x"),
      predict.value(source, "y"),
      predict.value(source, "z"),
    );
    group.current.rotation.y = predict.value(source, "heading");

    // Camera follow for own player
    if (isMe) {
      lookAt.current.lerp(group.current.position, 0.1);
      camera.lookAt(lookAt.current);
    }
  });

  return (
    <group ref={group}>
      <Html position-y={0.55}>
        <h1 className="text-center whitespace-nowrap text-white drop-shadow-md backdrop-filter bg-slate-300 bg-opacity-30 backdrop-blur-lg rounded-md py-2 px-4 text-xl transform -translate-x-1/2">
          {player.name || "Player"}
        </h1>
      </Html>
      <Car model={player.car} scale={0.32} />
      {isMe && (
        <PerspectiveCamera makeDefault position={[0, 1.5, -3]} near={1} />
      )}
    </group>
  );
};
