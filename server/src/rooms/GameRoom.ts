import { Room, Client, CloseCode } from "colyseus";
import { GameRoomState, Player } from "./schema/MyRoomState.js";

export class GameRoom extends Room {
  maxClients = 4;
  state = new GameRoomState();

  messages = {
    setCar: (client: Client, car: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.car = car;
      }
    },
    setName: (client: Client, name: string) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.name = name;
      }
    },
    setGameState: (client: Client, gameState: string) => {
      // Only host can change game state
      if (client.sessionId === this.state.hostId) {
        this.state.gameState = gameState;
      }
    },
    input: (client: Client, input: { pressed: boolean; angle: number; respawn: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.joystickPressed = input.pressed;
        player.joystickAngle = input.angle;
        player.respawnPressed = input.respawn;
      }
    },
    updatePosition: (client: Client, data: {
      sessionId: string;
      x: number;
      y: number;
      z: number;
      rotX: number;
      rotY: number;
      rotZ: number;
      rotW: number;
    }) => {
      const player = this.state.players.get(data.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.z = data.z;
        player.rotX = data.rotX;
        player.rotY = data.rotY;
        player.rotZ = data.rotZ;
        player.rotW = data.rotW;
      }
    },
  }

  onCreate(options: any) {
    console.log("GameRoom created!");
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    // Create new player
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || "";
    player.car = "sedanSports";

    // Set initial position with some randomness
    player.x = (Math.random() - 0.5) * 8;
    player.y = 2;
    player.z = (Math.random() - 0.5) * 8;

    this.state.players.set(client.sessionId, player);

    // First player becomes host
    if (this.state.hostId === "") {
      this.state.hostId = client.sessionId;
      console.log("Host set to:", client.sessionId);
    }
  }

  onLeave(client: Client, code: number) {
    console.log(client.sessionId, "left!");
    const consented = (code === CloseCode.CONSENTED);

    // Remove player
    this.state.players.delete(client.sessionId);

    // If host left, assign new host
    if (client.sessionId === this.state.hostId) {
      const remainingPlayers = Array.from(this.state.players.keys());
      if (remainingPlayers.length > 0) {
        this.state.hostId = remainingPlayers[0];
        console.log("New host:", this.state.hostId);
      } else {
        this.state.hostId = "";
      }
    }
  }

  onDispose() {
    console.log("GameRoom disposing...");
  }
}
