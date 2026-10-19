import type { ChannelConfig, MeasurementResult } from './types'

function crossingIndices(
  samples: Float32Array,
  mid: number,
): number[] {
  const indices: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!
    const curr = samples[i]!
    if ((prev < mid && curr >= mid) || (prev > mid && curr <= mid)) {
      indices.push(i)
    }
  }
  return indices
}

export function measureAnalog(
  channel: ChannelConfig,
  samples: Float32Array,
  sampleRateHz: number,
): MeasurementResult {
  let vmax = -Infinity
  let vmin = Infinity
  let sum = 0
  let sumSq = 0

  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]!
    if (v > vmax) vmax = v
    if (v < vmin) vmin = v
    sum += v
    sumSq += v * v
  }

  const n = samples.length || 1
  const vavg = sum / n
  const vrms = Math.sqrt(sumSq / n)
  const vpp = vmax - vmin
  const mid = (vmax + vmin) / 2

  const crossings = crossingIndices(samples, mid)
  let periodS: number | null = null
  let frequencyHz: number | null = null

  if (crossings.length >= 3) {
    const periods: number[] = []
    for (let i = 2; i < crossings.length; i += 2) {
      periods.push((crossings[i]! - crossings[i - 2]!) / sampleRateHz)
    }
    if (periods.length > 0) {
      periodS = periods.reduce((a, b) => a + b, 0) / periods.length
      frequencyHz = periodS > 0 ? 1 / periodS : null
    }
  }

  let highSamples = 0
  for (let i = 0; i < samples.length; i++) {
    if (samples[i]! >= mid) highSamples++
  }
  const dutyCycle = highSamples / n
  const highTimeS = periodS != null ? periodS * dutyCycle : null
  const lowTimeS = periodS != null ? periodS * (1 - dutyCycle) : null

  return {
    channelId: channel.id,
    channelName: channel.name,
    frequencyHz,
    periodS,
    vpp: Number.isFinite(vpp) ? vpp : null,
    vmax: Number.isFinite(vmax) ? vmax : null,
    vmin: Number.isFinite(vmin) ? vmin : null,
    vavg: Number.isFinite(vavg) ? vavg : null,
    vrms: Number.isFinite(vrms) ? vrms : null,
    dutyCycle: Number.isFinite(dutyCycle) ? dutyCycle : null,
    highTimeS,
    lowTimeS,
  }
}

export function measureDigital(
  channel: ChannelConfig,
  samples: Uint8Array,
  sampleRateHz: number,
): MeasurementResult {
  const edges: number[] = []
  for (let i = 1; i < samples.length; i++) {
    if (samples[i] !== samples[i - 1]) edges.push(i)
  }

  let periodS: number | null = null
  let frequencyHz: number | null = null
  let highTimeS: number | null = null
  let lowTimeS: number | null = null
  let dutyCycle: number | null = null

  if (edges.length >= 2) {
    const periods: number[] = []
    for (let i = 1; i < edges.length; i++) {
      // full period = rising-to-rising or falling-to-falling
      if (i + 1 < edges.length && samples[edges[i]!] === samples[edges[i - 1]!]) {
        periods.push((edges[i + 1]! - edges[i - 1]!) / sampleRateHz)
      }
    }
    // Prefer rising-edge periods
    const risingPeriods: number[] = []
    for (let i = 0; i < edges.length - 1; i++) {
      const idx = edges[i]!
      if (samples[idx] === 1) {
        for (let j = i + 1; j < edges.length; j++) {
          if (samples[edges[j]!] === 1) {
            risingPeriods.push((edges[j]! - idx) / sampleRateHz)
            break
          }
        }
      }
    }
    const use = risingPeriods.length > 0 ? risingPeriods : periods
    if (use.length > 0) {
      periodS = use.reduce((a, b) => a + b, 0) / use.length
      frequencyHz = periodS > 0 ? 1 / periodS : null
    }
  }

  let high = 0
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] === 1) high++
  }
  dutyCycle = samples.length > 0 ? high / samples.length : null
  if (periodS != null && dutyCycle != null) {
    highTimeS = periodS * dutyCycle
    lowTimeS = periodS * (1 - dutyCycle)
  }

  return {
    channelId: channel.id,
    channelName: channel.name,
    frequencyHz,
    periodS,
    vpp: null,
    vmax: null,
    vmin: null,
    vavg: null,
    vrms: null,
    dutyCycle,
    highTimeS,
    lowTimeS,
  }
}
