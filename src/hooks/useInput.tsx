import { useEffect, useRef, useState, useCallback } from "react";

interface JoystickInput {
  pressed: boolean;
  angle: number;
  respawn: boolean;
}

// Virtual joystick component for touch input
export const VirtualJoystick = ({ onInput }: { onInput: (input: JoystickInput) => void }) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const centerRef = useRef({ x: 0, y: 0 });
  const maxDistance = 50;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    setIsDragging(true);
    handleMove(clientX, clientY);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging && !centerRef.current.x) return;

    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
    const angle = Math.atan2(dy, dx);

    // Convert to game angle (0 = forward, PI/2 = right)
    // Original joystick: angle 0 = right, PI/2 = down
    // We want: angle 0 = forward (negative Y in screen space)
    const gameAngle = angle + Math.PI / 2;

    if (knobRef.current) {
      const knobX = Math.cos(angle) * distance;
      const knobY = Math.sin(angle) * distance;
      knobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    if (distance > 10) {
      onInput({
        pressed: true,
        angle: gameAngle < 0 ? gameAngle + Math.PI * 2 : gameAngle,
        respawn: false,
      });
    } else {
      onInput({ pressed: false, angle: 0, respawn: false });
    }
  }, [isDragging, onInput]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
    onInput({ pressed: false, angle: 0, respawn: false });
  }, [onInput]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      if (isDragging) handleEnd();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY);
      }
    };
    const onMouseUp = () => {
      if (isDragging) handleEnd();
    };

    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  return (
    <div
      ref={joystickRef}
      className="fixed bottom-24 left-8 w-32 h-32 rounded-full bg-white bg-opacity-30 backdrop-blur-sm border-2 border-white border-opacity-50 flex items-center justify-center touch-none select-none z-20"
      onTouchStart={(e) => {
        e.preventDefault();
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onMouseDown={(e) => {
        handleStart(e.clientX, e.clientY);
      }}
    >
      <div
        ref={knobRef}
        className="w-12 h-12 rounded-full bg-white bg-opacity-70 shadow-lg pointer-events-none"
      />
    </div>
  );
};

// Respawn button component
export const RespawnButton = ({ onRespawn }: { onRespawn: () => void }) => {
  return (
    <button
      className="fixed bottom-24 right-8 w-20 h-20 rounded-full bg-red-500 bg-opacity-70 backdrop-blur-sm text-white font-bold text-sm shadow-lg z-20 active:scale-95 transition-transform"
      onTouchStart={(e) => {
        e.preventDefault();
        onRespawn();
      }}
      onMouseDown={onRespawn}
    >
      Respawn
    </button>
  );
};

// Hook for keyboard input
export const useInput = (enabled = true) => {
  const [input, setInput] = useState<JoystickInput>({
    pressed: false,
    angle: 0,
    respawn: false,
  });

  const keysPressed = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    if (!enabled) return;

    const updateInput = () => {
      const { forward, backward, left, right } = keysPressed.current;

      if (!forward && !backward && !left && !right) {
        setInput((prev) => ({ ...prev, pressed: false }));
        return;
      }

      // Calculate angle based on keys
      // Forward = 0, Backward = PI, Left = PI*1.5, Right = PI*0.5
      let angle = 0;

      if (forward && !backward) {
        if (left && !right) angle = Math.PI * 1.75; // Forward-left
        else if (right && !left) angle = Math.PI * 0.25; // Forward-right
        else angle = 0; // Forward
      } else if (backward && !forward) {
        if (left && !right) angle = Math.PI * 1.25; // Backward-left
        else if (right && !left) angle = Math.PI * 0.75; // Backward-right
        else angle = Math.PI; // Backward
      } else if (left && !right) {
        angle = Math.PI * 1.5; // Left
      } else if (right && !left) {
        angle = Math.PI * 0.5; // Right
      }

      setInput((prev) => ({ ...prev, pressed: true, angle }));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keysPressed.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          keysPressed.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          keysPressed.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keysPressed.current.right = true;
          break;
        case "Space":
          setInput((prev) => ({ ...prev, respawn: true }));
          setTimeout(() => setInput((prev) => ({ ...prev, respawn: false })), 100);
          return;
      }
      updateInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keysPressed.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keysPressed.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keysPressed.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keysPressed.current.right = false;
          break;
      }
      updateInput();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled]);

  return input;
};

// Combined input provider with UI
export const InputControls = ({ onInput }: { onInput: (input: JoystickInput) => void }) => {
  const handleJoystickInput = useCallback((joystickInput: JoystickInput) => {
    onInput(joystickInput);
  }, [onInput]);

  const handleRespawn = useCallback(() => {
    onInput({ pressed: false, angle: 0, respawn: true });
    setTimeout(() => {
      onInput({ pressed: false, angle: 0, respawn: false });
    }, 100);
  }, [onInput]);

  // Only show touch controls on touch devices
  const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  if (!isTouchDevice) {
    return null;
  }

  return (
    <>
      <VirtualJoystick onInput={handleJoystickInput} />
      <RespawnButton onRespawn={handleRespawn} />
    </>
  );
};
