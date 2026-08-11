import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Leva } from "leva";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { useRoomState } from "./colyseus";
import { VirtualJoystick, RespawnButton } from "./components/TouchControls";
import { setCarControls, queueRespawn } from "./controls";
import { useCallback } from "react";

interface TouchInput {
  pressed: boolean;
  angle: number;
  respawn: boolean;
}

// NOTE: This component expects `room` to always be available.
// The parent AppLoader in main.tsx ensures this by only rendering App after connection.
function App() {
  const gameState = useRoomState((s) => s?.gameState);

  // Touch input only STAGES controls — the CarDriver's fixed-step send loop
  // is the single thing that transmits input (one send per predicted step).
  const handleJoystickInput = useCallback((input: TouchInput) => {
    setCarControls(input.pressed, input.angle);
  }, []);

  const handleRespawn = useCallback(() => {
    queueRespawn();
  }, []);

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
