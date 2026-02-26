import { Html, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody, euler, quat, vec3 } from "@react-three/rapier";
import { useControls } from "leva";
import { useRoom, useRoomState, useGameActions } from "../colyseus";
import { useInput } from "../hooks/useInput";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { randInt } from "three/src/math/MathUtils.js";
import { Car } from "./Car";

const CAR_SPEEDS: Record<string, number> = {
  sedanSports: 4,
  raceFuture: 2,
  taxi: 5.5,
  ambulance: 8.5,
  police: 5.5,
  truck: 4.8,
  firetruck: 10,
};

export const CarController = ({ player }: { player: any }) => {
  const rb = useRef<any>(null);
  const { room } = useRoom();
  const { updatePosition, sendInput } = useGameActions();
  const hostId = useRoomState((s: any) => s?.hostId);

  const mySessionId = room!.sessionId;
  const isMe = player.sessionId === mySessionId;
  const isHost = hostId === mySessionId;

  // Get input for this player
  const localInput = useInput(isMe);

  const { rotationSpeed, carSpeed } = useControls({
    carSpeed: {
      value: 3,
      min: 0,
      max: 10,
      step: 0.1,
    },
    rotationSpeed: {
      value: 3,
      min: 0,
      max: 10,
      step: 0.01,
    },
  });

  const lookAt = useRef(new Vector3(0, 0, 0));
  const lastInputSent = useRef({ pressed: false, angle: 0, respawn: false });

  useFrame(({ camera }, delta) => {
    if (!rb.current) {
      return;
    }

    // Camera follow for own player
    if (isMe) {
      const targetLookAt = vec3(rb.current.translation());
      lookAt.current.lerp(targetLookAt, 0.1);
      camera.lookAt(lookAt.current);
    }

    // Determine input source
    // If this is my player, use local input
    // If this is another player, use their synced input from state
    const joystickPressed = isMe ? localInput.pressed : player.joystickPressed;
    const joystickAngle = isMe ? localInput.angle : player.joystickAngle;
    const respawnPressed = isMe ? localInput.respawn : player.respawnPressed;

    // Send input to server if this is my player and input changed
    if (isMe) {
      const inputChanged =
        lastInputSent.current.pressed !== localInput.pressed ||
        lastInputSent.current.angle !== localInput.angle ||
        lastInputSent.current.respawn !== localInput.respawn;

      if (inputChanged) {
        sendInput({
          pressed: localInput.pressed,
          angle: localInput.angle,
          respawn: localInput.respawn,
        });
        lastInputSent.current = { ...localInput };
      }
    }

    const rotVel = rb.current.angvel();

    // Apply physics (host calculates for all, or each client for themselves)
    if (isHost || isMe) {
      if (joystickPressed) {
        const angle = joystickAngle;
        const dir = angle > Math.PI / 2 ? 1 : -1;
        rotVel.y = -dir * Math.sin(angle) * rotationSpeed;

        const impulse = vec3({
          x: 0,
          y: 0,
          z: (CAR_SPEEDS[player.car] || carSpeed) * delta * dir,
        });
        const eulerRot = euler().setFromQuaternion(quat(rb.current.rotation()));
        impulse.applyEuler(eulerRot);
        rb.current.applyImpulse(impulse, true);
      }
      rb.current.setAngvel(rotVel, true);
    }

    // Position sync
    if (isHost) {
      // Host syncs all player positions to server
      const pos = rb.current.translation();
      const rot = rb.current.rotation();
      updatePosition(player.sessionId, pos, rot);
    } else if (!isMe) {
      // Non-host clients apply synced positions for other players
      rb.current.setTranslation({ x: player.x, y: player.y, z: player.z });
      rb.current.setRotation({ x: player.rotX, y: player.rotY, z: player.rotZ, w: player.rotW });
    }

    // Handle respawn
    if (respawnPressed && isHost) {
      respawn();
    }
  });

  const respawn = () => {
    rb.current.setTranslation({
      x: randInt(-2, 2) * 4,
      y: 2,
      z: randInt(-2, 2) * 4,
    });
    rb.current.setLinvel({ x: 0, y: 0, z: 0 });
    rb.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
    rb.current.setAngvel({ x: 0, y: 0, z: 0 });
  };

  // Initial spawn
  useEffect(() => {
    if (isHost && rb.current) {
      respawn();
    }
  }, [isHost]);

  // Get initial position from state
  const initialPos = { x: player.x, y: player.y, z: player.z };
  const initialRot = { x: player.rotX, y: player.rotY, z: player.rotZ, w: player.rotW };

  return (
    <group>
      <RigidBody
        ref={rb}
        colliders={"hull"}
        key={player.car}
        position={[initialPos.x, initialPos.y, initialPos.z]}
        rotation={euler().setFromQuaternion(quat(initialRot))}
        onIntersectionEnter={(e) => {
          if (e.other.rigidBodyObject?.name === "void") {
            if (isHost) {
              respawn();
            }
          }
        }}
      >
        <Html position-y={0.55}>
          <h1 className="text-center whitespace-nowrap text-white drop-shadow-md backdrop-filter bg-slate-300 bg-opacity-30 backdrop-blur-lg rounded-md py-2 px-4 text-xl transform -translate-x-1/2">
            {player.name || "Player"}
          </h1>
        </Html>
        <Car model={player.car} scale={0.32} />
        {isMe && (
          <PerspectiveCamera makeDefault position={[0, 1.5, -3]} near={1} />
        )}
      </RigidBody>
    </group>
  );
};
