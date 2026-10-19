import { describe, expect, it } from 'vitest'
import { generateAnalog, generateDigital } from './generators'
import { measureAnalog, measureDigital } from './measurements'
import type { AnalogChannelConfig, DigitalChannelConfig } from './types'

const analogCh: AnalogChannelConfig = {
  id: 'ch1',
  name: 'CH1',
  kind: 'analog',
  enabled: true,
  color: '#fff',
  voltsPerDiv: 1,
  offsetDivs: 0,
  probeAttenuation: 1,
  waveform: 'sine',
  frequencyHz: 1000,
  amplitudeV: 1,
  dcOffsetV: 0,
  dutyCycle: 0.5,
  phaseDeg: 0,
}

const digitalCh: DigitalChannelConfig = {
  id: 'd0',
  name: 'D0',
  kind: 'digital',
  enabled: true,
  color: '#fff',
  waveform: 'square',
  frequencyHz: 2000,
  dutyCycle: 0.5,
  phaseDeg: 0,
  thresholdV: 1.65,
  bitIndex: 0,
}

describe('measureAnalog', () => {
  it('estimates frequency and peak-to-peak for a sine', () => {
    const samples = generateAnalog({
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeV: 1.5,
      dcOffsetV: 0,
      dutyCycle: 0.5,
      phaseDeg: 0,
      sampleRateHz: 100_000,
      sampleCount: 5000,
    })
    const m = measureAnalog(analogCh, samples, 100_000)
    expect(m.frequencyHz).not.toBeNull()
    expect(m.frequencyHz!).toBeGreaterThan(950)
    expect(m.frequencyHz!).toBeLessThan(1050)
    expect(m.vpp!).toBeGreaterThan(2.8)
    expect(m.vpp!).toBeLessThan(3.2)
  })
})

describe('measureDigital', () => {
  it('estimates frequency for a square wave', () => {
    const samples = generateDigital({
      waveform: 'square',
      frequencyHz: 2000,
      dutyCycle: 0.5,
      phaseDeg: 0,
      bitIndex: 0,
      sampleRateHz: 200_000,
      sampleCount: 4000,
    })
    const m = measureDigital(digitalCh, samples, 200_000)
    expect(m.frequencyHz).not.toBeNull()
    expect(m.frequencyHz!).toBeGreaterThan(1900)
    expect(m.frequencyHz!).toBeLessThan(2100)
    expect(m.dutyCycle!).toBeGreaterThan(0.45)
    expect(m.dutyCycle!).toBeLessThan(0.55)
  })
})
