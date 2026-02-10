import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import your "app.config.ts" file here.
import appConfig from "../src/app.config.js";
import { GameRoomState } from "../src/rooms/schema/MyRoomState.js";

describe("testing GameRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into a room", async () => {
    // `room` is the server-side Room instance reference.
    const room = await colyseus.createRoom<GameRoomState>("game_room", {});

    // `client1` is the client-side `Room` instance reference (same as JavaScript SDK)
    const client1 = await colyseus.connectTo(room);

    // make your assertions
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);

    // wait for state sync
    await room.waitForNextPatch();

    // Check initial state
    assert.strictEqual(client1.state.gameState, "lobby");
    assert.strictEqual(client1.state.hostId, client1.sessionId);
    assert.strictEqual(client1.state.players.size, 1);
  });

  it("first player becomes host", async () => {
    const room = await colyseus.createRoom<GameRoomState>("game_room", {});
    
    const client1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    assert.strictEqual(client1.state.hostId, client1.sessionId);
    
    const client2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    // First client should still be host
    assert.strictEqual(client1.state.hostId, client1.sessionId);
    assert.strictEqual(client1.state.players.size, 2);
  });

  it("host can change game state", async () => {
    const room = await colyseus.createRoom<GameRoomState>("game_room", {});
    
    const client1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    // Host changes game state
    client1.send("setGameState", "game");
    await room.waitForNextPatch();
    
    assert.strictEqual(client1.state.gameState, "game");
  });

  it("non-host cannot change game state", async () => {
    const room = await colyseus.createRoom<GameRoomState>("game_room", {});
    
    const client1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    const client2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    // Non-host tries to change game state
    client2.send("setGameState", "game");
    await room.waitForNextPatch();
    
    // State should remain unchanged
    assert.strictEqual(client1.state.gameState, "lobby");
  });

  it("player can change their car", async () => {
    const room = await colyseus.createRoom<GameRoomState>("game_room", {});
    
    const client1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    client1.send("setCar", "taxi");
    await room.waitForNextPatch();
    
    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.car, "taxi");
  });

  it("player can change their name", async () => {
    const room = await colyseus.createRoom<GameRoomState>("game_room", {});
    
    const client1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    client1.send("setName", "TestPlayer");
    await room.waitForNextPatch();
    
    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.name, "TestPlayer");
  });

  it("new host is assigned when host leaves", async () => {
    const room = await colyseus.createRoom<GameRoomState>("game_room", {});
    
    const client1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    const client2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    
    // Client1 is host
    assert.strictEqual(client1.state.hostId, client1.sessionId);
    
    // Client1 leaves
    client1.leave();
    await room.waitForNextPatch();
    
    // Client2 should become host
    assert.strictEqual(client2.state.hostId, client2.sessionId);
    assert.strictEqual(client2.state.players.size, 1);
  });
});
