import { Client } from "@colyseus/sdk";
import { useCallback } from "react";
import { createRoomContext } from "@colyseus/react";

import type { GameRoom } from "../server/src/rooms/GameRoom";
import type { server } from "../server/src/app.config";

// Same origin in dev AND prod: the colyseus/vite plugin attaches the game
// server to Vite's dev server, and the production build serves the client
// from the game server (serveClient).
const getServerUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
};

export const client = new Client<typeof server>(getServerUrl());

export const {
  RoomProvider,
  useRoom,
  useRoomState,
  useRoomMessage,
  // Predict hooks (Colyseus 0.18 netcode)
  usePredict,
  useInput,
  useReconciler,
  useAttachAll,
  usePredictLoop,
  useSessionEntity,
} = createRoomContext<GameRoom>({
  // Remote players render 100ms in the past, interpolated between snapshots.
  // Also binds the lag-comp render-delay stamp, should the server enable it.
  predict: { mode: "lerp", delay: 100 },
});

// App-specific convenience hook for sending game messages.
export function useGameActions() {
  const { room } = useRoom();

  const setGameState = useCallback((gameState: string) => {
    room!.send("setGameState", gameState);
  }, [room]);

  const setCar = useCallback((car: string) => {
    room!.send("setCar", car);
  }, [room]);

  const setName = useCallback((name: string) => {
    room!.send("setName", name);
  }, [room]);

  return { setGameState, setCar, setName };
}
