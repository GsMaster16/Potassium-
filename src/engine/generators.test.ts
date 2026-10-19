import { describe, expect, it } from 'vitest'
import { generateAnalog, generateDigital } from './generators'

describe('generateAnalog', () => {
  it('produces a sine centered near DC offset', () => {
    const samples = generateAnalog({
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeV: 2,
      dcOffsetV: 0.5,
      dutyCycle: 0.5,
      phaseDeg: 0,
      sampleRateHz: 100_000,
      sampleCount: 1000,
    })

    expect(samples.length).toBe(1000)
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length
    expect(avg).toBeGreaterThan(0.3)
    expect(avg).toBeLessThan(0.7)

    let max = -Infinity
    let min = Infinity
    for (const v of samples) {
      if (v > max) max = v
      if (v < min) min = v
    }
    expect(max).toBeGreaterThan(2.0)
    expect(min).toBeLessThan(-1.0)
  })

  it('respects PWM duty cycle on square waves', () => {
    const samples = generateAnalog({
      waveform: 'pwm',
      frequencyHz: 1000,
      amplitudeV: 1,
      dcOffsetV: 0,
      dutyCycle: 0.25,
      phaseDeg: 0,
      sampleRateHz: 100_000,
      sampleCount: 1000,
    })
    const high = [...samples].filter((v) => v > 0).length
    expect(high / samples.length).toBeGreaterThan(0.2)
    expect(high / samples.length).toBeLessThan(0.35)
  })
})

describe('generateDigital', () => {
  it('emits only 0/1 values', () => {
    const samples = generateDigital({
      waveform: 'square',
      frequencyHz: 10_000,
      dutyCycle: 0.5,
      phaseDeg: 0,
      bitIndex: 0,
      sampleRateHz: 1_000_000,
      sampleCount: 500,
    })
    for (const bit of samples) {
      expect(bit === 0 || bit === 1).toBe(true)
    }
  })

  it('creates UART framing with start bits', () => {
    const samples = generateDigital({
      waveform: 'uart',
      frequencyHz: 115_200,
      dutyCycle: 0.5,
      phaseDeg: 0,
      bitIndex: 0,
      sampleRateHz: 2_000_000,
      sampleCount: 4000,
    })
    expect(samples.includes(0)).toBe(true)
    expect(samples.includes(1)).toBe(true)
  })
})
