import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { useRoom, useRoomState } from "./colyseus";
import { VirtualJoystick, RespawnButton } from "./hooks/useInput";
import { useCallback, useState } from "react";

// NOTE: This component expects `room` to always be available.
// The parent AppLoader in main.jsx ensures this by only rendering App after connection.
function App() {
  const { room } = useRoom();
  const [touchInput, setTouchInput] = useState({ pressed: false, angle: 0, respawn: false });
  const gameState = useRoomState((s) => s?.gameState);

  const handleJoystickInput = useCallback((input) => {
    setTouchInput(input);
    room.send("input", input);
  }, [room]);

  const handleRespawn = useCallback(() => {
    room.send("input", { pressed: touchInput.pressed, angle: touchInput.angle, respawn: true });
    setTimeout(() => {
      room.send("input", { pressed: touchInput.pressed, angle: touchInput.angle, respawn: false });
    }, 100);
  }, [room, touchInput]);

  // Check if touch device
  const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  return (
    <>
      <UI />
      <Leva hidden />
      {/* Touch controls for game mode */}
      {gameState === "game" && isTouchDevice && (
        <>
          <VirtualJoystick onInput={handleJoystickInput} />
          <RespawnButton onRespawn={handleRespawn} />
        </>
      )}
      <Canvas
        shadows
        camera={{ position: [4.2, 1.5, 7.5], fov: 45, near: 0.5 }}
      >
        <color attach="background" args={["#333"]} />
        <Experience />
        <EffectComposer>
          <Bloom luminanceThreshold={1} intensity={1.22} />
        </EffectComposer>
      </Canvas>
    </>
  );
}

export default App;
