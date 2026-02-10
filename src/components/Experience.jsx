import { useRoomState } from "@colyseus/react";
import { useColyseus } from "../hooks/useColyseus";
import { Game } from "./Game";
import { Lobby } from "./Lobby";

export const Experience = () => {
  const { room } = useColyseus();
  const gameState = useRoomState(room, (s) => s?.gameState);

  return (
    <>
      {gameState === "lobby" && <Lobby />}
      {gameState === "game" && <Game />}
    </>
  );
};
