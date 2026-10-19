# Potassium

Mixed-signal oscilloscope and logic analyzer for analog voltages and digital signals.

Potassium is a browser-based **MSO-style instrument**: analog channels behave like an oscilloscope (voltage vs time), while digital lanes behave like a logic analyzer (logic levels vs time). A built-in signal simulator drives capture so you can explore triggering, measurements, and protocol-like patterns without hardware.

## Features

- **Analog scope channels** — sine, square, triangle, sawtooth, noise, PWM with V/div, offset, amplitude, and duty controls
- **Digital logic lanes** — up to 8 channels with square / UART / I²C / SPI-style simulated traffic
- **Triggering** — rising, falling, or either-edge on any enabled source, with adjustable level
- **Timebase** — from 1 µs/div to 1 s/div with auto sample-rate selection
- **Run / Stop / Single** acquisition modes
- **Cursors** — Δt and Δv readouts
- **Auto measurements** — frequency, Vpp, Vrms, duty cycle, and related timing

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

```bash
npm test        # unit tests for capture math
npm run build   # production bundle
```

## Architecture

| Layer | Role |
| --- | --- |
| `src/engine/generators.ts` | Synthesize analog voltages and digital bitstreams |
| `src/engine/trigger.ts` | Edge detect and align the capture window |
| `src/engine/capture.ts` | Acquire a frame at the current timebase |
| `src/engine/measurements.ts` | Frequency, amplitude, and duty metrics |
| `src/components/ScopeCanvas.tsx` | Graticule + waveform rendering |
| `src/components/Controls.tsx` | Instrument front-panel controls |

Capture is simulated in software today. The engine API (`acquireFrame`) is shaped so a future WebUSB / Web Serial / native ADC backend can replace the generators without changing the display path.

## Legacy

The original decompiled dump that shipped in this repository is preserved under `archive/` and is not part of the app runtime.
