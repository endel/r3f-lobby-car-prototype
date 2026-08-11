import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useInputBuffer } from "@colyseus/react";
import { useRoom, useInput, useReconciler, usePredictLoop } from "../colyseus";
import { applyCarInput, type CarBody } from "../../server/src/shared/carSim";
import { carControls, setCarControls, consumeRespawn, angleFromKeys } from "../controls";

/**
 * Owns the netcode for the local player, mounted once inside the game scene:
 *
 * - `useReconciler` predicts our own car with the SAME `applyCarInput` the
 *   server runs, reconciling to authoritative state on every ack.
 * - `usePredictLoop` (external mode) drives `predict.tick()` from R3F's
 *   frame loop at priority -1, so ticks + sends happen before any component
 *   reads render values ("send before you read").
 * - Keyboard is sampled into `carControls` (held state, live) and the
 *   respawn tap is buffered so it lands on exactly one fixed step.
 */
export const CarDriver = () => {
  const { room } = useRoom();
  const input = useInput();
  const respawn = useInputBuffer();

  useReconciler(
    (state, r) => state.players.get(r.sessionId),
    {
      step: (ctx, player, cmd) => {
        // Other cars for collision: latest decoded positions — the client's
        // best estimate of what the server collides against. Contact with a
        // moving car may reconcile; smoothing absorbs it.
        const others: CarBody[] = [];
        const players = room?.state.players;
        if (players) {
          for (const [sid, other] of players) {
            if (sid !== room!.sessionId) others.push(other);
          }
        }
        applyCarInput(player, cmd, ctx.dt, others);
      },
      smoothing: 15,
      snap: 5,   // respawn-sized corrections pop instead of gliding
    },
  );

  // Keyboard → shared controls (refs, not state: no re-render per keypress).
  const keys = useRef({ forward: false, backward: false, left: false, right: false });
  useEffect(() => {
    const update = (code: string, down: boolean): boolean => {
      switch (code) {
        case "KeyW": case "ArrowUp": keys.current.forward = down; return true;
        case "KeyS": case "ArrowDown": keys.current.backward = down; return true;
        case "KeyA": case "ArrowLeft": keys.current.left = down; return true;
        case "KeyD": case "ArrowRight": keys.current.right = down; return true;
        default: return false;
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        respawn.press();
        return;
      }
      if (update(e.code, true)) {
        const { forward, backward, left, right } = keys.current;
        const next = angleFromKeys(forward, backward, left, right);
        setCarControls(next.pressed, next.angle);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (update(e.code, false)) {
        const { forward, backward, left, right } = keys.current;
        const next = angleFromKeys(forward, backward, left, right);
        setCarControls(next.pressed, next.angle);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [respawn]);

  // The frame driver: tick → stage → send, once per fixed step due.
  const drive = usePredictLoop((steps) => {
    if (!input) return;
    for (let i = 0; i < steps; i++) {
      input.data.pressed = carControls.pressed;
      input.data.angle = carControls.angle;
      input.data.respawn = respawn.consume() || consumeRespawn();
      input.send();
    }
  }, { external: true });

  // Priority -1: runs before every default-priority useFrame reader.
  useFrame(() => drive(), -1);

  return null;
};
