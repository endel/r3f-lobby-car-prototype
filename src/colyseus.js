import { Client } from "@colyseus/sdk";
import { useCallback } from "react";
import { createRoomContext } from "@colyseus/react";

// Get server URL based on environment
const getServerUrl = () => {
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  return "ws://localhost:2567";
};

export const client = new Client(getServerUrl());

export const { RoomProvider, useRoom, useRoomState } = createRoomContext();

// App-specific convenience hook for sending game messages.
export function useGameActions() {
  const { room } = useRoom();

  const setGameState = useCallback((gameState) => {
    room.send("setGameState", gameState);
  }, [room]);

  const setCar = useCallback((car) => {
    room.send("setCar", car);
  }, [room]);

  const setName = useCallback((name) => {
    room.send("setName", name);
  }, [room]);

  const sendInput = useCallback((input) => {
    room.send("input", input);
  }, [room]);

  const updatePosition = useCallback((sessionId, pos, rot) => {
    room.send("updatePosition", {
      sessionId,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      rotX: rot.x,
      rotY: rot.y,
      rotZ: rot.z,
      rotW: rot.w,
    });
  }, [room]);

  return { setGameState, setCar, setName, sendInput, updatePosition };
}
