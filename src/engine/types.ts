export type ChannelKind = 'analog' | 'digital'

export type Waveform =
  | 'sine'
  | 'square'
  | 'triangle'
  | 'sawtooth'
  | 'noise'
  | 'pwm'
  | 'uart'
  | 'i2c'
  | 'spi'
  | 'custom'

export type TriggerSlope = 'rising' | 'falling' | 'either'
export type RunMode = 'run' | 'stop' | 'single'

export interface AnalogChannelConfig {
  id: string
  name: string
  kind: 'analog'
  enabled: boolean
  color: string
  voltsPerDiv: number
  offsetDivs: number
  probeAttenuation: number
  waveform: Waveform
  frequencyHz: number
  amplitudeV: number
  dcOffsetV: number
  dutyCycle: number
  phaseDeg: number
}

export interface DigitalChannelConfig {
  id: string
  name: string
  kind: 'digital'
  enabled: boolean
  color: string
  waveform: Waveform
  frequencyHz: number
  dutyCycle: number
  phaseDeg: number
  thresholdV: number
  /** Bit index into shared digital bus patterns */
  bitIndex: number
}

export type ChannelConfig = AnalogChannelConfig | DigitalChannelConfig

export interface TriggerConfig {
  sourceId: string
  slope: TriggerSlope
  levelV: number
  holdoffMs: number
}

export interface TimebaseConfig {
  secondsPerDiv: number
  sampleRateHz: number
  bufferSamples: number
  positionPct: number
}

export interface CaptureFrame {
  sampleRateHz: number
  sampleCount: number
  triggerIndex: number
  analog: Record<string, Float32Array>
  digital: Record<string, Uint8Array>
  timestampMs: number
}

export interface MeasurementResult {
  channelId: string
  channelName: string
  frequencyHz: number | null
  periodS: number | null
  vpp: number | null
  vmax: number | null
  vmin: number | null
  vavg: number | null
  vrms: number | null
  dutyCycle: number | null
  highTimeS: number | null
  lowTimeS: number | null
}

export interface CursorState {
  enabled: boolean
  t1: number
  t2: number
  v1: number
  v2: number
}

export const DIVISIONS_H = 10
export const DIVISIONS_V = 8

export const TIME_PER_DIV_OPTIONS = [
  1e-6, 2e-6, 5e-6,
  10e-6, 20e-6, 50e-6,
  100e-6, 200e-6, 500e-6,
  1e-3, 2e-3, 5e-3,
  10e-3, 20e-3, 50e-3,
  100e-3, 200e-3, 500e-3,
  1,
] as const

export const VOLTS_PER_DIV_OPTIONS = [
  0.01, 0.02, 0.05,
  0.1, 0.2, 0.5,
  1, 2, 5,
  10,
] as const
