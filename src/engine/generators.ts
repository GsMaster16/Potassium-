import type { Waveform } from './types'

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

function frac(x: number): number {
  return x - Math.floor(x)
}

/** Deterministic pseudo-noise from sample index */
function noise(i: number): number {
  const n = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return (n - Math.floor(n)) * 2 - 1
}

export interface AnalogGenParams {
  waveform: Waveform
  frequencyHz: number
  amplitudeV: number
  dcOffsetV: number
  dutyCycle: number
  phaseDeg: number
  sampleRateHz: number
  sampleCount: number
  timeOffsetS?: number
}

export function generateAnalog(params: AnalogGenParams): Float32Array {
  const {
    waveform,
    frequencyHz,
    amplitudeV,
    dcOffsetV,
    dutyCycle,
    phaseDeg,
    sampleRateHz,
    sampleCount,
    timeOffsetS = 0,
  } = params

  const out = new Float32Array(sampleCount)
  const phase0 = (phaseDeg / 360) * 2 * Math.PI
  const duty = clamp01(dutyCycle)

  for (let i = 0; i < sampleCount; i++) {
    const t = timeOffsetS + i / sampleRateHz
    const phase = phase0 + 2 * Math.PI * frequencyHz * t
    const cycle = frac(frequencyHz * t + phaseDeg / 360)
    let unit = 0

    switch (waveform) {
      case 'sine':
        unit = Math.sin(phase)
        break
      case 'square':
      case 'pwm':
        unit = cycle < duty ? 1 : -1
        break
      case 'triangle': {
        const x = cycle
        unit = x < 0.5 ? 4 * x - 1 : 3 - 4 * x
        break
      }
      case 'sawtooth':
        unit = 2 * cycle - 1
        break
      case 'noise':
        unit = noise(i + Math.floor(timeOffsetS * sampleRateHz))
        break
      case 'uart':
        unit = uartBit(t, frequencyHz, phaseDeg) ? 1 : -1
        break
      case 'i2c':
        unit = i2cSda(t, frequencyHz) ? 1 : -1
        break
      case 'spi':
        unit = spiMosi(t, frequencyHz, phaseDeg) ? 1 : -1
        break
      default:
        unit = Math.sin(phase)
    }

    out[i] = dcOffsetV + amplitudeV * unit
  }

  return out
}

export interface DigitalGenParams {
  waveform: Waveform
  frequencyHz: number
  dutyCycle: number
  phaseDeg: number
  bitIndex: number
  sampleRateHz: number
  sampleCount: number
  timeOffsetS?: number
}

export function generateDigital(params: DigitalGenParams): Uint8Array {
  const {
    waveform,
    frequencyHz,
    dutyCycle,
    phaseDeg,
    bitIndex,
    sampleRateHz,
    sampleCount,
    timeOffsetS = 0,
  } = params

  const out = new Uint8Array(sampleCount)
  const duty = clamp01(dutyCycle)

  for (let i = 0; i < sampleCount; i++) {
    const t = timeOffsetS + i / sampleRateHz
    const cycle = frac(frequencyHz * t + phaseDeg / 360)
    let high = false

    switch (waveform) {
      case 'square':
      case 'pwm':
        high = cycle < duty
        break
      case 'sine':
      case 'triangle':
      case 'sawtooth':
        high = Math.sin(2 * Math.PI * frequencyHz * t + (phaseDeg * Math.PI) / 180) >= 0
        break
      case 'noise':
        high = noise(i + bitIndex * 997) > 0
        break
      case 'uart':
        high = uartBit(t, frequencyHz, bitIndex * 37)
        break
      case 'i2c':
        high = bitIndex % 2 === 0 ? i2cScl(t, frequencyHz) : i2cSda(t, frequencyHz)
        break
      case 'spi':
        if (bitIndex % 3 === 0) high = spiClk(t, frequencyHz)
        else if (bitIndex % 3 === 1) high = spiMosi(t, frequencyHz, phaseDeg)
        else high = spiCs(t, frequencyHz)
        break
      default:
        high = cycle < 0.5
    }

    out[i] = high ? 1 : 0
  }

  return out
}

/** Simulated UART idle-high with start/data/stop framing */
function uartBit(t: number, baud: number, seed: number): boolean {
  const bitPeriod = 1 / Math.max(1, baud)
  const frameBits = 10
  const framePeriod = frameBits * bitPeriod
  const frameIndex = Math.floor(t / framePeriod)
  const bitInFrame = Math.floor((t % framePeriod) / bitPeriod)
  const payload = (frameIndex * 17 + seed) & 0xff

  if (bitInFrame === 0) return false // start
  if (bitInFrame >= 9) return true // stop / idle
  return ((payload >> (bitInFrame - 1)) & 1) === 1
}

function i2cScl(t: number, freq: number): boolean {
  const period = 1 / Math.max(1, freq)
  const phase = (t % period) / period
  return phase < 0.5
}

function i2cSda(t: number, freq: number): boolean {
  const period = 1 / Math.max(1, freq)
  const bit = Math.floor(t / period)
  const nibble = bit % 16
  // start (SDA falls while SCL high), address bits, ACK low, stop
  if (nibble === 0) return true
  if (nibble === 1) return false
  if (nibble === 9) return false
  if (nibble === 15) return true
  return ((0xa5 >> (nibble % 8)) & 1) === 1
}

function spiClk(t: number, freq: number): boolean {
  const period = 1 / Math.max(1, freq)
  return ((t % period) / period) < 0.5
}

function spiMosi(t: number, freq: number, seed: number): boolean {
  const period = 1 / Math.max(1, freq)
  const bit = Math.floor(t / period)
  const byte = Math.floor(bit / 8)
  const bitInByte = 7 - (bit % 8)
  const value = (0x5a ^ ((byte + seed) & 0xff)) & 0xff
  return ((value >> bitInByte) & 1) === 1
}

function spiCs(t: number, freq: number): boolean {
  const wordPeriod = 16 / Math.max(1, freq)
  const phase = (t % (wordPeriod * 2)) / wordPeriod
  return phase >= 1 // active low: high when idle
}
