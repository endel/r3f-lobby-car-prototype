import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("string") car: string = "sedanSports";

  // Position
  @type("number") x: number = 0;
  @type("number") y: number = 2;
  @type("number") z: number = 0;

  // Rotation (quaternion)
  @type("number") rotX: number = 0;
  @type("number") rotY: number = 0;
  @type("number") rotZ: number = 0;
  @type("number") rotW: number = 1;

  // Input state (for non-host clients to broadcast their input)
  @type("boolean") joystickPressed: boolean = false;
  @type("number") joystickAngle: number = 0;
  @type("boolean") respawnPressed: boolean = false;
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameState: string = "lobby";
  @type("string") hostId: string = "";
}
