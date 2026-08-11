import { schema, t, type SchemaType } from "@colyseus/schema";

/**
 * Per-client wire input, declared with `defineInput()` on the server.
 * The client never imports this — `room.input()` resolves the schema from
 * the join handshake automatically.
 */
export const CarInput = schema({
  pressed: t.boolean(),
  angle: t.float32(),      // joystick angle relative to the car
  respawn: t.boolean(),
});

export type CarInput = SchemaType<typeof CarInput>;
