import { Environment, Gltf, Lightformer } from "@react-three/drei";
import { useRoomState, useAttachAll } from "../colyseus";
import { CarController } from "./CarController";
import { CarDriver } from "./CarDriver";
import { GameArea } from "./GameArea";

export const Game = () => {
  const players = useRoomState((s: any) => s?.players);

  // Passive smoothing for every player: linear fields and the angular
  // heading in separate attaches (shortest-arc interpolation for radians).
  // Our own car's reconciler takes over its slots while it lives.
  useAttachAll("players", { mode: "lerp", fields: ["x", "y", "z"] });
  useAttachAll("players", { mode: "lerp", fields: ["heading"], angle: true });

  return (
    <group>
      <ambientLight intensity={0.4} />
      <Environment>
        <Lightformer
          position={[5, 5, 5]}
          form="rect"
          intensity={1}
          color="white"
          scale={[10, 10] as any}
          target={[0, 0, 0]}
        />
      </Environment>
      <pointLight position={[0, 5, 0]} intensity={2.5} distance={10} />
      <pointLight
        position={[5, 5, 0]}
        intensity={10.5}
        distance={10}
        color="pink"
      />
      <pointLight
        position={[-5, 5, 0]}
        intensity={10.5}
        distance={15}
        color="blue"
      />
      <directionalLight position={[10, 10, 10]} intensity={0.4} />

      <CarDriver />
      {Object.values(players ?? {}).map((player: any) => (
        <CarController key={player.sessionId} player={player} />
      ))}

      {/* same π flip the original applied — the baked collision AABBs in
          carSim.ts assume this orientation */}
      <group rotation-y={Math.PI}>
        <GameArea />
      </group>
      <Gltf src="/models/map_road.glb" />
    </group>
  );
};
