/**
 * Deterministic car simulation — SHARED between server and client.
 *
 * The server applies it once per fixed tick (`setFixedTimestep`); the client
 * predicts with the exact same function through `useReconciler`. Plain math
 * only (no engine), per the determinism contract:
 * https://docs.colyseus.io/netcode/determinism
 */

export const TICK_RATE = 30;

/** Per-car top-speed flavor (matches the original prototype's table). */
export const CAR_SPEEDS: Record<string, number> = {
  sedanSports: 4,
  raceFuture: 2,
  taxi: 5.5,
  ambulance: 8.5,
  police: 5.5,
  truck: 4.8,
  firetruck: 10,
};

const TURN_RATE = 3;        // rad/s steering rate
const ACCEL_FACTOR = 4;     // thrust = carSpeed * ACCEL_FACTOR (u/s²)
const DRAG = 2.2;           // 1/s velocity damping
const GRAVITY = 25;         // u/s² once off the arena
const ARENA_HALF = 9.5;     // the drivable plane is 18×18, plus a little edge
const GROUND_Y = 0;
const KILL_Y = -8;          // fell far enough → respawn

/** The scalar fields the simulation advances (mirrored by the reconciler). */
export interface CarPose {
  x: number;
  y: number;
  z: number;
  heading: number;   // yaw, radians; 0 faces -Z
  vx: number;
  vy: number;
  vz: number;
  spawnIdx: number;
  car: string;
}

/** The wire input (matches the CarInput schema; fields default when unset). */
export interface CarCommand {
  pressed?: boolean;
  angle?: number;    // joystick angle relative to the car: 0 = forward, π/2 = right
  respawn?: boolean;
}

const wrapAngle = (a: number): number => {
  if (a > Math.PI) return a - Math.PI * 2;
  if (a < -Math.PI) return a + Math.PI * 2;
  return a;
};

/** Deterministic spawn slot on a 3×3 grid, keyed by the join order index. */
export function spawnPose(spawnIdx: number): { x: number; y: number; z: number; heading: number } {
  const slot = spawnIdx % 9;
  const col = (slot % 3) - 1;
  const row = Math.floor(slot / 3) - 1;
  const x = col * 4;
  const z = row * 4;
  // face the arena center (forward is -Z at heading 0)
  const heading = (x === 0 && z === 0) ? 0 : Math.atan2(x, z);
  return { x, y: GROUND_Y, z, heading };
}

export function respawn(p: CarPose): void {
  const pose = spawnPose(p.spawnIdx);
  p.x = pose.x;
  p.y = pose.y;
  p.z = pose.z;
  p.heading = pose.heading;
  p.vx = 0;
  p.vy = 0;
  p.vz = 0;
}

/**
 * Advance one car by one fixed step. Mutates `p` in place.
 * MUST stay deterministic: everything it reads lives on `p` or `cmd`.
 */
export function applyCarInput(p: CarPose, cmd: CarCommand, dt: number): void {
  const onGround = p.y <= GROUND_Y + 1e-6;

  if (cmd.pressed && onGround) {
    // Relative joystick: lateral component steers, longitudinal throttles.
    const angle = cmd.angle ?? 0;
    const lateral = Math.sin(angle);
    const longitudinal = Math.cos(angle);

    p.heading = wrapAngle(p.heading - lateral * TURN_RATE * dt);

    const thrust = (CAR_SPEEDS[p.car] ?? 3) * ACCEL_FACTOR * longitudinal;
    p.vx += -Math.sin(p.heading) * thrust * dt;   // heading 0 → -Z forward
    p.vz += -Math.cos(p.heading) * thrust * dt;
  }

  const drag = Math.max(0, 1 - DRAG * dt);
  p.vx *= drag;
  p.vz *= drag;

  p.x += p.vx * dt;
  p.z += p.vz * dt;

  // Off the arena edge: fall. On it: stick to the ground plane.
  const insideArena = Math.abs(p.x) <= ARENA_HALF && Math.abs(p.z) <= ARENA_HALF;
  if (!insideArena || p.y > GROUND_Y) {
    p.vy -= GRAVITY * dt;
    p.y += p.vy * dt;
    if (insideArena && p.y <= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
    }
  }

  if (cmd.respawn || p.y < KILL_Y) {
    respawn(p);
  }
}
