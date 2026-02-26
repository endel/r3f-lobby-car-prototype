import { Environment, Gltf, Lightformer } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import { useRoomState } from "../colyseus";
import { CarController } from "./CarController";
import { GameArea } from "./GameArea";

export const Game = () => {
  const players = useRoomState((s: any) => s?.players);

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
      <Physics>
        {Object.values(players).map((player: any) => (
          <CarController key={player.sessionId} player={player} />
        ))}
        <RigidBody type="fixed" colliders="hull" rotation-y={Math.PI}>
          <GameArea />
        </RigidBody>
        <RigidBody
          type="fixed"
          sensor
          colliders={false}
          position-y={-5}
          name="void"
        >
          <CuboidCollider args={[20, 3, 20]} />
        </RigidBody>
        <Gltf src="/models/map_road.glb" />
      </Physics>
    </group>
  );
};
