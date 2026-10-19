import { describe, expect, it } from 'vitest'
import { findAnalogEdge, findDigitalEdge, locateTrigger } from './trigger'

describe('findAnalogEdge', () => {
  it('finds a rising edge at the threshold', () => {
    const samples = Float32Array.from([-1, -0.5, -0.1, 0.2, 0.8])
    expect(findAnalogEdge(samples, 0, 'rising')).toBe(3)
  })

  it('finds a falling edge', () => {
    const samples = Float32Array.from([1, 0.5, 0.1, -0.2, -0.8])
    expect(findAnalogEdge(samples, 0, 'falling')).toBe(3)
  })
})

describe('findDigitalEdge', () => {
  it('detects rising digital transitions', () => {
    const samples = Uint8Array.from([0, 0, 1, 1, 0])
    expect(findDigitalEdge(samples, 'rising')).toBe(2)
  })
})

describe('locateTrigger', () => {
  it('uses the selected analog source', () => {
    const analog = {
      ch1: Float32Array.from([-1, -0.2, 0.3, 1]),
    }
    const index = locateTrigger(analog, {}, {
      sourceId: 'ch1',
      slope: 'rising',
      levelV: 0,
      holdoffMs: 0,
    })
    expect(index).toBe(2)
  })
})
