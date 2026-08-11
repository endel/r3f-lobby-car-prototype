import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("string") car: string = "sedanSports";

  // Pose — advanced by the shared deterministic sim (carSim.ts)
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") heading: number = 0;

  // Velocity — part of the sim state so prediction replays bit-identically
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") vz: number = 0;

  // Deterministic respawn slot (assigned at join)
  @type("uint8") spawnIdx: number = 0;
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameState: string = "lobby";
  @type("string") hostId: string = "";
}
