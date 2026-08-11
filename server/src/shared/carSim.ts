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

/** Collision circle radius of a car (cars render at scale 0.32). */
export const CAR_RADIUS = 0.35;
const CAR_BOUNCE = 0.35;    // restitution of car-vs-car bumps

interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Static building footprints, extracted from map_buildings.glb accessor
 * bounds with the scene's rotation-y={Math.PI} baked in. Regenerate with
 * scripts if the map changes.
 */
const BUILDINGS: readonly Aabb[] = [
  { minX: 5, maxX: 7, minZ: -3, maxZ: -1 },       // building_A
  { minX: 1, maxX: 3, minZ: -3, maxZ: -1 },       // building_B
  { minX: -3, maxX: -1, minZ: -3, maxZ: -1 },     // building_C
  { minX: 5, maxX: 7, minZ: -7.02, maxZ: -5 },    // building_D
  { minX: -3, maxX: -1, minZ: -7, maxZ: -5 },     // building_E
  { minX: 1, maxX: 3, minZ: -7, maxZ: -5 },       // building_F
  { minX: -7, maxX: -5, minZ: -7, maxZ: -5 },     // building_G
  { minX: -7, maxX: -5, minZ: -3, maxZ: -1 },     // building_H
  { minX: 5, maxX: 7, minZ: 0.98, maxZ: 3 },      // building_D.001
  { minX: -3, maxX: -1, minZ: 1, maxZ: 3 },       // building_E.001
  { minX: 1, maxX: 3, minZ: 1, maxZ: 3 },         // building_F.001
  { minX: -7, maxX: -5, minZ: 1, maxZ: 3 },       // building_G.001
  { minX: 5, maxX: 7, minZ: 5, maxZ: 7 },         // building_A.001
  { minX: 1, maxX: 3, minZ: 5, maxZ: 7 },         // building_B.001
  { minX: -3, maxX: -1, minZ: 5, maxZ: 7 },       // building_C.001
  { minX: -7, maxX: -5, minZ: 5, maxZ: 7 },       // building_H.001
];

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

/** Another car's position, for circle-vs-circle collision. */
export interface CarBody {
  x: number;
  z: number;
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
  // face along the open road toward the center axis (never into a building
  // corner); forward is +Z at heading 0
  let heading = 0;
  if (Math.abs(x) >= Math.abs(z) && x !== 0) {
    heading = x > 0 ? -Math.PI / 2 : Math.PI / 2;   // face ∓X toward x=0
  } else if (z !== 0) {
    heading = z > 0 ? Math.PI : 0;                  // face ∓Z toward z=0
  }
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

/** Slide `p` out of any building it overlaps, killing inward velocity. */
function resolveBuildings(p: CarPose): void {
  for (const b of BUILDINGS) {
    const cx = Math.min(Math.max(p.x, b.minX), b.maxX);
    const cz = Math.min(Math.max(p.z, b.minZ), b.maxZ);
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= CAR_RADIUS * CAR_RADIUS) continue;

    if (d2 > 1e-9) {
      // outside the box face: push out along the contact normal, keep the
      // tangential velocity (slide along walls)
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const nz = dz / d;
      p.x = cx + nx * CAR_RADIUS;
      p.z = cz + nz * CAR_RADIUS;
      const vn = p.vx * nx + p.vz * nz;
      if (vn < 0) {
        p.vx -= vn * nx;
        p.vz -= vn * nz;
      }
    } else {
      // center inside the box (tunneled): exit along the shallowest axis
      const exits = [
        { pen: p.x - b.minX, apply: () => { p.x = b.minX - CAR_RADIUS; p.vx = 0; } },
        { pen: b.maxX - p.x, apply: () => { p.x = b.maxX + CAR_RADIUS; p.vx = 0; } },
        { pen: p.z - b.minZ, apply: () => { p.z = b.minZ - CAR_RADIUS; p.vz = 0; } },
        { pen: b.maxZ - p.z, apply: () => { p.z = b.maxZ + CAR_RADIUS; p.vz = 0; } },
      ];
      exits.reduce((a, e) => (e.pen < a.pen ? e : a)).apply();
    }
  }
}

/** Push `p` out of overlapping cars with a small bounce. */
function resolveCars(p: CarPose, others: readonly CarBody[]): void {
  const minDist = CAR_RADIUS * 2;
  for (const o of others) {
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const d2 = dx * dx + dz * dz;
    if (d2 >= minDist * minDist) continue;

    let nx: number;
    let nz: number;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      nx = dx / d;
      nz = dz / d;
    } else {
      // exactly stacked: deterministic tie-break along our heading
      nx = Math.sin(p.heading);
      nz = Math.cos(p.heading);
    }
    p.x = o.x + nx * minDist;
    p.z = o.z + nz * minDist;
    const vn = p.vx * nx + p.vz * nz;
    if (vn < 0) {
      p.vx -= (1 + CAR_BOUNCE) * vn * nx;
      p.vz -= (1 + CAR_BOUNCE) * vn * nz;
    }
  }
}

/**
 * Advance one car by one fixed step. Mutates `p` in place.
 * MUST stay deterministic: everything it reads lives on `p`, `cmd` or the
 * static map. `others` (the other cars' positions) is the one approximate
 * input: the server passes live entities; the predicting client passes its
 * latest decoded remotes, so contact against moving cars may reconcile.
 */
export function applyCarInput(p: CarPose, cmd: CarCommand, dt: number, others?: readonly CarBody[]): void {
  const onGround = p.y <= GROUND_Y + 1e-6;

  if (cmd.pressed && onGround) {
    // Relative joystick: lateral component steers, longitudinal throttles.
    const angle = cmd.angle ?? 0;
    const lateral = Math.sin(angle);
    const longitudinal = Math.cos(angle);

    p.heading = wrapAngle(p.heading - lateral * TURN_RATE * dt);

    const thrust = (CAR_SPEEDS[p.car] ?? 3) * ACCEL_FACTOR * longitudinal;
    p.vx += Math.sin(p.heading) * thrust * dt;   // heading 0 → +Z forward
    p.vz += Math.cos(p.heading) * thrust * dt;
  }

  const drag = Math.max(0, 1 - DRAG * dt);
  p.vx *= drag;
  p.vz *= drag;

  p.x += p.vx * dt;
  p.z += p.vz * dt;

  if (onGround) {
    resolveBuildings(p);
    if (others && others.length > 0) resolveCars(p, others);
  }

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
