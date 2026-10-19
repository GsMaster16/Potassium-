import type { TriggerConfig, TriggerSlope } from './types'

export function findAnalogEdge(
  samples: Float32Array,
  level: number,
  slope: TriggerSlope,
  startIndex = 1,
): number {
  for (let i = Math.max(1, startIndex); i < samples.length; i++) {
    const prev = samples[i - 1]!
    const curr = samples[i]!
    const rising = prev < level && curr >= level
    const falling = prev > level && curr <= level
    if (slope === 'rising' && rising) return i
    if (slope === 'falling' && falling) return i
    if (slope === 'either' && (rising || falling)) return i
  }
  return -1
}

export function findDigitalEdge(
  samples: Uint8Array,
  slope: TriggerSlope,
  startIndex = 1,
): number {
  for (let i = Math.max(1, startIndex); i < samples.length; i++) {
    const prev = samples[i - 1]!
    const curr = samples[i]!
    const rising = prev === 0 && curr === 1
    const falling = prev === 1 && curr === 0
    if (slope === 'rising' && rising) return i
    if (slope === 'falling' && falling) return i
    if (slope === 'either' && (rising || falling)) return i
  }
  return -1
}

export function locateTrigger(
  analog: Record<string, Float32Array>,
  digital: Record<string, Uint8Array>,
  trigger: TriggerConfig,
  searchStart = 1,
): number {
  const analogBuf = analog[trigger.sourceId]
  if (analogBuf) {
    return findAnalogEdge(analogBuf, trigger.levelV, trigger.slope, searchStart)
  }
  const digitalBuf = digital[trigger.sourceId]
  if (digitalBuf) {
    return findDigitalEdge(digitalBuf, trigger.slope, searchStart)
  }
  return -1
}

/** Align capture so trigger sits near horizontal center (50%). */
export function alignToTrigger(
  analog: Record<string, Float32Array>,
  digital: Record<string, Uint8Array>,
  triggerIndex: number,
  targetIndex: number,
): { analog: Record<string, Float32Array>; digital: Record<string, Uint8Array>; triggerIndex: number } {
  const shift = triggerIndex - targetIndex
  if (shift === 0 || triggerIndex < 0) {
    return { analog, digital, triggerIndex: Math.max(0, triggerIndex) }
  }

  const shiftAnalog = (buf: Float32Array): Float32Array => {
    const out = new Float32Array(buf.length)
    for (let i = 0; i < buf.length; i++) {
      const src = i + shift
      out[i] = src >= 0 && src < buf.length ? buf[src]! : out[i - 1] ?? 0
    }
    return out
  }

  const shiftDigital = (buf: Uint8Array): Uint8Array => {
    const out = new Uint8Array(buf.length)
    for (let i = 0; i < buf.length; i++) {
      const src = i + shift
      out[i] = src >= 0 && src < buf.length ? buf[src]! : out[i - 1] ?? 0
    }
    return out
  }

  const nextAnalog: Record<string, Float32Array> = {}
  for (const [id, buf] of Object.entries(analog)) {
    nextAnalog[id] = shiftAnalog(buf)
  }
  const nextDigital: Record<string, Uint8Array> = {}
  for (const [id, buf] of Object.entries(digital)) {
    nextDigital[id] = shiftDigital(buf)
  }

  return {
    analog: nextAnalog,
    digital: nextDigital,
    triggerIndex: targetIndex,
  }
}
