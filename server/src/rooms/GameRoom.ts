import { Room, Client, CloseCode } from "colyseus";
import { GameRoomState, Player } from "./schema/GameRoomState.js";
import { CarInput } from "../shared/CarInput.js";
import { applyCarInput, respawn, TICK_RATE } from "../shared/carSim.js";

export class GameRoom extends Room<{ state: GameRoomState, input: CarInput }> {
  maxClients = 4;
  state = new GameRoomState();

  // Per-client input schema, buffered per session. Also powers the client's
  // clock-sync and lets `room.input()` resolve the schema without a
  // client-side constructor.
  inputs = this.defineInput(CarInput, {
    bufferMaxSize: 64,
    sanitize: {
      angle: [0, Math.PI * 2],   // NaN-safe clamp — never trust the wire
    },
    // No idle policy: server steps stay 1:1 with client inputs (the replay
    // invariant behind prediction). Predicting clients send every tick —
    // an unchanged frame is a body-less packet — so drag still integrates.
  });

  spawnCounter = 0;

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
  }

  onCreate(options: any) {
    console.log("GameRoom created!");

    // Fixed-step authoritative simulation — the rate is advertised to
    // predicting clients through the join handshake.
    this.setFixedTimestep((ctx) => this.step(ctx), TICK_RATE);
  }

  step(ctx: { dt: number }) {
    for (const [sessionId, player] of this.state.players) {
      // One entity per client, independent sims → iterate consumption style:
      // each buffered input advances this car by one fixed step.
      for (const cmd of this.inputs.get(sessionId)) {
        applyCarInput(player, cmd, ctx.dt);
      }
    }
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || "";
    player.car = "sedanSports";
    player.spawnIdx = this.spawnCounter++ % 9;
    respawn(player);

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
