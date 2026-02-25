import { useRoomState } from "../colyseus";
import { Game } from "./Game";
import { Lobby } from "./Lobby";

export const Experience = () => {
  const gameState = useRoomState((s) => s?.gameState);

  return (
    <>
      {gameState === "lobby" && <Lobby />}
      {gameState === "game" && <Game />}
    </>
  );
};
