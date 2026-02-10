import { Client } from "@colyseus/sdk";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const ColyseusContext = createContext(null);

// Get server URL based on environment
const getServerUrl = () => {
  if (import.meta.env.PROD) {
    // In production, use the same host
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  // In development, connect to local Colyseus server
  return "ws://localhost:2567";
};

const client = new Client(getServerUrl());

//
// Workaround for React.StrictMode, to avoid multiple join requests
//
let hasActiveJoinRequest = false;

export function ColyseusProvider({ children }) {
  const roomRef = useRef(null);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    const connect = async () => {
      if (hasActiveJoinRequest) { return; }
      hasActiveJoinRequest = true;

      try {
        setConnecting(true);
        const joinedRoom = await client.joinOrCreate("game_room");
        roomRef.current = joinedRoom;
        setConnecting(false);

        joinedRoom.onLeave((code) => {
          console.log("Left room with code:", code);
          roomRef.current = null;
        });

        joinedRoom.onError((code, message) => {
          console.error("Room error:", code, message);
          setError(message);
        });
      } catch (e) {
        console.error("Failed to connect:", e);
        setError(e.message);
        setConnecting(false);

      } finally {
        hasActiveJoinRequest = false;
      }
    };

    connect();

    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
    };
  }, [client]);

  // Helper to set game state (only host should call this)
  const setGameState = useCallback((gameState) => {
    if (roomRef.current) {
      roomRef.current.send("setGameState", gameState);
    }
  }, []);

  // Helper to set car for current player
  const setCar = useCallback((car) => {
    if (roomRef.current) {
      roomRef.current.send("setCar", car);
    }
  }, []);

  // Helper to set name for current player
  const setName = useCallback((name) => {
    if (roomRef.current) {
      roomRef.current.send("setName", name);
    }
  }, []);

  // Helper to send input
  const sendInput = useCallback((input) => {
    if (roomRef.current) {
      roomRef.current.send("input", input);
    }
  }, []);

  // Helper to update position (only host should call this)
  const updatePosition = useCallback((sessionId, pos, rot) => {
    if (roomRef.current) {
      roomRef.current.send("updatePosition", {
        sessionId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        rotX: rot.x,
        rotY: rot.y,
        rotZ: rot.z,
        rotW: rot.w,
      });
    }
  }, []);

  const value = {
    client,
    room: roomRef.current,
    roomRef,
    error,
    connecting,
    setGameState,
    setCar,
    setName,
    sendInput,
    updatePosition,
  };

  return (
    <ColyseusContext.Provider value={value}>
      {children}
    </ColyseusContext.Provider>
  );
}

export function useColyseus() {
  const context = useContext(ColyseusContext);
  if (!context) {
    throw new Error("useColyseus must be used within a ColyseusProvider");
  }
  return context;
}
