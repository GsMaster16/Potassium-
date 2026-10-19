import { generateAnalog, generateDigital } from './generators'
import { alignToTrigger, locateTrigger } from './trigger'
import type {
  CaptureFrame,
  ChannelConfig,
  TimebaseConfig,
  TriggerConfig,
} from './types'
import { DIVISIONS_H } from './types'

export function recommendedSampleRate(secondsPerDiv: number): number {
  // Aim for ~400 samples per division so fast digital edges stay sharp
  const windowS = secondsPerDiv * DIVISIONS_H
  const target = Math.round((400 * DIVISIONS_H) / windowS)
  const clamped = Math.min(20_000_000, Math.max(20_000, target))
  const nice = [
    20e3, 50e3, 100e3, 200e3, 500e3,
    1e6, 2e6, 5e6, 10e6, 20e6,
  ]
  return nice.reduce((best, rate) =>
    Math.abs(rate - clamped) < Math.abs(best - clamped) ? rate : best,
  )
}

export function captureWindowSamples(timebase: TimebaseConfig): number {
  const windowS = timebase.secondsPerDiv * DIVISIONS_H
  return Math.max(256, Math.round(windowS * timebase.sampleRateHz))
}

export function acquireFrame(
  channels: ChannelConfig[],
  timebase: TimebaseConfig,
  trigger: TriggerConfig,
  timeOffsetS: number,
): CaptureFrame {
  const sampleCount = Math.min(
    timebase.bufferSamples,
    Math.max(captureWindowSamples(timebase) * 2, 1024),
  )
  const sampleRateHz = timebase.sampleRateHz

  const analog: Record<string, Float32Array> = {}
  const digital: Record<string, Uint8Array> = {}

  for (const ch of channels) {
    if (!ch.enabled) continue
    if (ch.kind === 'analog') {
      analog[ch.id] = generateAnalog({
        waveform: ch.waveform,
        frequencyHz: ch.frequencyHz,
        amplitudeV: ch.amplitudeV,
        dcOffsetV: ch.dcOffsetV,
        dutyCycle: ch.dutyCycle,
        phaseDeg: ch.phaseDeg,
        sampleRateHz,
        sampleCount,
        timeOffsetS,
      })
    } else {
      digital[ch.id] = generateDigital({
        waveform: ch.waveform,
        frequencyHz: ch.frequencyHz,
        dutyCycle: ch.dutyCycle,
        phaseDeg: ch.phaseDeg,
        bitIndex: ch.bitIndex,
        sampleRateHz,
        sampleCount,
        timeOffsetS,
      })
    }
  }

  let triggerIndex = locateTrigger(analog, digital, trigger, 1)
  const targetIndex = Math.floor(sampleCount * (timebase.positionPct / 100))

  if (triggerIndex >= 0) {
    const aligned = alignToTrigger(analog, digital, triggerIndex, targetIndex)
    Object.assign(analog, aligned.analog)
    Object.assign(digital, aligned.digital)
    triggerIndex = aligned.triggerIndex
  } else {
    // Free-run: keep scrolling without alignment
    triggerIndex = targetIndex
  }

  // Trim to visible window centered on trigger position
  const visible = captureWindowSamples(timebase)
  const start = Math.max(0, Math.min(sampleCount - visible, triggerIndex - Math.floor(visible / 2)))
  const end = Math.min(sampleCount, start + visible)

  const sliceAnalog: Record<string, Float32Array> = {}
  for (const [id, buf] of Object.entries(analog)) {
    sliceAnalog[id] = buf.slice(start, end)
  }
  const sliceDigital: Record<string, Uint8Array> = {}
  for (const [id, buf] of Object.entries(digital)) {
    sliceDigital[id] = buf.slice(start, end)
  }

  return {
    sampleRateHz,
    sampleCount: end - start,
    triggerIndex: triggerIndex - start,
    analog: sliceAnalog,
    digital: sliceDigital,
    timestampMs: performance.now(),
  }
}
