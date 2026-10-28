# Bloopy App v0.2 — Physical Preview

Bloopy is a Next.js companion app that now doubles as the UI for the physical Raspberry Pi Bloopy prototype.

## What is connected

The app can show and control the physical body through a loopback-only bridge exposed by Bloopy Brain:

- Raspberry Pi camera / local face-person perception state
- ESP32 telemetry: light, distance, tilt, motion, sound, ESP state
- MAX98357A speaker volume
- physical sleep / wake
- “look at me” camera-tracking behavior
- microphone / speech mode status
- cooling fan status (direct power; read-only)
- honest capability status for movement and battery telemetry (not installed yet)

The browser never talks to the hardware bridge directly. Browser → Next.js `/api/robot/*` → `127.0.0.1:8765` Bloopy Brain.

## Chat + physical actions

The app chat has a strict approved tool set. It can read physical status and perform only these actions:

- sleep
- wake
- look at me
- set speaker volume

There is no shell tool, arbitrary GPIO tool, motor tool, or fan-control tool.

## Environment

Copy `.env.example` to `.env.local` and set the real values. Never commit `.env.local`.

## Development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm ci
npm run build
npm start
```

## Raspberry Pi

See `BLOOPY_PI_UPDATE_GUIDE.md` for the physical brain bridge, app service, password recovery setup, deployment workflow, and Labwc touchscreen kiosk installer.

Useful local endpoints on the Pi:

- `http://127.0.0.1:3000/api/health` — app readiness only
- `http://127.0.0.1:8765/status` — loopback-only physical brain bridge
