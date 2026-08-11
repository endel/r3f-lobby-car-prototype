/**
 * Shared input staging — written by React event handlers (DOM overlay,
 * keyboard), consumed once per fixed step by the CarDriver's send loop.
 *
 * Held state (joystick direction) is sampled live; edge state (respawn tap)
 * is queued and consumed on exactly one step — the "latch, then consume"
 * recipe: https://docs.colyseus.io/netcode/recipes
 */

export const carControls = {
  pressed: false,
  angle: 0,
};

export function setCarControls(pressed: boolean, angle: number): void {
  carControls.pressed = pressed;
  carControls.angle = angle;
}

let respawnQueued = false;

/** Queue a respawn tap (DOM button / touch). */
export function queueRespawn(): void {
  respawnQueued = true;
}

/** Read-and-clear the queued respawn — call from the send loop only. */
export function consumeRespawn(): boolean {
  const value = respawnQueued;
  respawnQueued = false;
  return value;
}

/**
 * Keyboard → joystick mapping (same angles as the original prototype:
 * 0 = forward, π/2 = right, π = back, 3π/2 = left).
 */
export function angleFromKeys(
  forward: boolean, backward: boolean, left: boolean, right: boolean,
): { pressed: boolean; angle: number } {
  if (!forward && !backward && !left && !right) {
    return { pressed: false, angle: 0 };
  }
  let angle = 0;
  if (forward && !backward) {
    if (left && !right) angle = Math.PI * 1.75;
    else if (right && !left) angle = Math.PI * 0.25;
    else angle = 0;
  } else if (backward && !forward) {
    if (left && !right) angle = Math.PI * 1.25;
    else if (right && !left) angle = Math.PI * 0.75;
    else angle = Math.PI;
  } else if (left && !right) {
    angle = Math.PI * 1.5;
  } else if (right && !left) {
    angle = Math.PI * 0.5;
  }
  return { pressed: true, angle };
}
