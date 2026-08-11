This project is a fork of [wass08/r3f-playroom-lobby-car-prototype](https://github.com/wass08/r3f-playroom-lobby-car-prototype?tab=readme-ov-file)

![Screenshot](./screenshot.webp)

## Run it

One command runs both the client and the game server — the
[`colyseus/vite` plugin](https://docs.colyseus.io) attaches the server to
Vite's dev server (same origin, HMR for room code included):

```
npm install
npm run dev
```

The Colyseus Playground is at `/playground`, the monitor at `/monitor`.

> Note: don't `npm install` inside `server/` for local dev — the vite plugin
> must share the root's colyseus modules. `server/package.json` exists for
> standalone/cloud deployments only.

## Production build

```
npm run build     # emits dist/client + dist/server/server.mjs
npm start         # serves both from the game server
```

## Netcode (Colyseus 0.18)

This prototype is server-authoritative with client-side prediction, built on
Colyseus 0.18 netcode and the `@colyseus/react` predict hooks:

- **Server** — `defineInput(CarInput)` + `setFixedTimestep(30)` drive a
  deterministic car sim (`server/src/shared/carSim.ts`), shared verbatim with
  the client. No physics engine: plain math satisfies the
  [determinism contract](https://docs.colyseus.io/netcode/determinism).
- **Client** — `CarDriver.tsx` predicts the local car with `useReconciler`
  (same `applyCarInput`, zero input latency) and drives ticks + sends from
  R3F's frame loop via `usePredictLoop({ external: true })` at priority -1.
  Remote cars render 100ms in the past via `useAttachAll` lerp smoothing.
  All cars read through the one idiom: `predict.value(instance, field)`.

Compared to the previous host-authoritative version: the server owns the
simulation (no `updatePosition` trust), inputs are sanitized schema packets,
and car-vs-car collisions are currently out (no shared physics world).
