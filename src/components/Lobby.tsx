import {
  Box,
  CameraControls,
  Html,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useAtom } from "jotai";
import { useRoom, useRoomState } from "../colyseus";
import { useEffect, useRef, useState } from "react";
import { MathUtils, Vector3 } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { audios, playAudio } from "../utils/AudioManager";
import { Car } from "./Car";
import { NameEditingAtom } from "./UI";

const CAR_SPACING = 2.5;

export const Lobby = () => {
  const [nameEditing, setNameEditing] = useAtom(NameEditingAtom);
  const controls = useRef<any>(null);
  const cameraReference = useRef<any>(null);

  const { room } = useRoom();

  const players = useRoomState((s: any) => s.players);
  const numPlayers = Object.keys(players).length;

  const mySessionId = room!.sessionId;

  const { scene } = useGLTF("/models/garage.glb");
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  const animatedLight = useRef<any>(null);

  useFrame(({ clock }) => {
    animatedLight.current.position.x =
      Math.sin(clock.getElapsedTime() * 0.5) * 2;

    controls.current.camera.position.x +=
      Math.cos(clock.getElapsedTime() * 0.5) * 0.25;
    controls.current.camera.position.y +=
      Math.sin(clock.getElapsedTime() * 1) * 0.125;
  });

  const shadowBias = -0.005;
  const shadowMapSize = 2048;

  const viewport = useThree((state) => state.viewport);
  const adjustCamera = () => {
    const distFactor =
      10 /
      viewport.getCurrentViewport(cameraReference.current, new Vector3(0, 0, 0))
        .width;
    controls.current.setLookAt(
      4.2 * distFactor,
      2 * distFactor,
      7.5 * distFactor,
      0,
      0.15,
      0,
      true
    );
  };

  useEffect(() => {
    adjustCamera();
  }, [players]);

  useEffect(() => {
    const onResize = () => {
      console.log("on resize");
      adjustCamera();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <PerspectiveCamera ref={cameraReference} position={[0, 1, 10]} />
      <CameraControls
        ref={controls}
        mouseButtons={{
          left: 0,
          middle: 0,
          right: 0,
          wheel: 0,
        }}
        touches={{
          one: 0,
          two: 0,
          three: 0,
        }}
      />
      <directionalLight position={[6, 4, 6]} intensity={0.4} color="white" />
      <group scale={0.66}>
        <primitive object={scene} />
        <group position={[5.5, 0.5, -1.2]}>
          <pointLight
            intensity={3}
            distance={15}
            decay={3}
            color="#4124c9" // blue
          />
          <Box scale={0.1} visible={false}>
            <meshBasicMaterial color="white" />
          </Box>
        </group>
        <group position={[-3, 3, -2]}>
          <pointLight
            intensity={3}
            decay={3}
            distance={6}
            color="#a5adff" // purple
          />
          <Box scale={0.1} visible={false}>
            <meshBasicMaterial color="white" />
          </Box>
        </group>

        <group position={[0, 2.5, 0.5]} ref={animatedLight}>
          <pointLight
            intensity={0.9}
            decay={2}
            distance={10}
            castShadow
            color="#f7d216" // Orange
            shadow-bias={shadowBias}
            shadow-mapSize-width={shadowMapSize}
            shadow-mapSize-height={shadowMapSize}
          />
          <Box scale={0.1} visible={false}>
            <meshBasicMaterial color="white" />
          </Box>
        </group>
        {Object.values(players).map((player: any, idx: number) => (
          <group
            position-x={
              idx * CAR_SPACING - ((numPlayers - 1) * CAR_SPACING) / 2
            }
            key={player.sessionId}
            scale={0.8}
          >
            {/* HTML labels (same idiom as the in-game name tags) — drei's
                <Text> relies on troika's WebGL1 SDF atlas, which breaks on
                browsers without ANGLE_instanced_arrays on WebGL1 contexts. */}
            <Html position-y={2.1} center zIndexRange={[10, 0]}>
              <div className="flex items-center gap-2 whitespace-nowrap text-white drop-shadow-md backdrop-filter bg-slate-300 bg-opacity-30 backdrop-blur-lg rounded-md py-1 px-3 text-2xl select-none">
                <span>{player.name || "Player"}</span>
                {player.sessionId === mySessionId && (
                  <img
                    src="images/edit.png"
                    alt="Edit name"
                    className="w-6 h-6 cursor-pointer"
                    onClick={() => setNameEditing(true)}
                  />
                )}
              </div>
            </Html>
            <group position-y={player.sessionId === mySessionId ? 0.15 : 0}>
              <CarSwitcher player={player} />
            </group>

            {player.sessionId === mySessionId && (
              <>
                <pointLight
                  position-x={1}
                  position-y={2}
                  intensity={2}
                  distance={3}
                />
                <group rotation-x={degToRad(-90)} position-y={0.01}>
                  <mesh receiveShadow>
                    <circleGeometry args={[2.2, 64]} />
                    <meshStandardMaterial
                      color="pink"
                      toneMapped={false}
                      emissive={"pink"}
                      emissiveIntensity={1.2}
                    />
                  </mesh>
                </group>
                <mesh position-y={0.1} receiveShadow>
                  <cylinderGeometry args={[2, 2, 0.2, 64]} />
                  <meshStandardMaterial color="#8572af" />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>
    </>
  );
};

const SWITCH_DURATION = 600;

const CarSwitcher = ({ player }: { player: any }) => {
  const changedCarAt = useRef(0);
  const container = useRef<any>(null);
  const [carModel, setCurrentCarModel] = useState(player.car);

  useFrame(() => {
    const timeSinceChange = Date.now() - changedCarAt.current;
    if (timeSinceChange < SWITCH_DURATION / 2) {
      container.current.rotation.y +=
        2 * (timeSinceChange / SWITCH_DURATION / 2);
      container.current.scale.x =
        container.current.scale.y =
        container.current.scale.z =
          1 - timeSinceChange / SWITCH_DURATION / 2;
    } else if (timeSinceChange < SWITCH_DURATION) {
      container.current.rotation.y +=
        4 * (1 - timeSinceChange / SWITCH_DURATION);
      container.current.scale.x =
        container.current.scale.y =
        container.current.scale.z =
          timeSinceChange / SWITCH_DURATION;
      if (container.current.rotation.y > Math.PI * 2) {
        container.current.rotation.y -= Math.PI * 2;
      }
    }
    if (timeSinceChange >= SWITCH_DURATION) {
      container.current.rotation.y = MathUtils.lerp(
        container.current.rotation.y,
        Math.PI * 2,
        0.1
      );
    }
  });

  // Check if car changed
  const newCar = player.car;
  if (newCar !== carModel) {
    playAudio(audios.car_start);
    changedCarAt.current = Date.now();
    setTimeout(() => {
      setCurrentCarModel(newCar);
    }, SWITCH_DURATION / 2);
  }

  return (
    <group ref={container}>
      <Car model={carModel} />
    </group>
  );
};

useGLTF.preload("/models/garage.glb");
