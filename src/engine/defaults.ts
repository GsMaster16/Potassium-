import type {
  AnalogChannelConfig,
  DigitalChannelConfig,
  TimebaseConfig,
  TriggerConfig,
} from './types'

export const ANALOG_COLORS = ['#3ec6ff', '#ffb020', '#5dffb0', '#ff6b8a'] as const
export const DIGITAL_COLORS = [
  '#7dd3fc',
  '#fcd34d',
  '#86efac',
  '#f9a8d4',
  '#c4b5fd',
  '#fda4af',
  '#a5f3fc',
  '#fde68a',
] as const

export function createDefaultAnalogChannels(): AnalogChannelConfig[] {
  return [
    {
      id: 'ch1',
      name: 'CH1',
      kind: 'analog',
      enabled: true,
      color: ANALOG_COLORS[0],
      voltsPerDiv: 1,
      offsetDivs: 1.5,
      probeAttenuation: 1,
      waveform: 'sine',
      frequencyHz: 1000,
      amplitudeV: 2,
      dcOffsetV: 0,
      dutyCycle: 0.5,
      phaseDeg: 0,
    },
    {
      id: 'ch2',
      name: 'CH2',
      kind: 'analog',
      enabled: true,
      color: ANALOG_COLORS[1],
      voltsPerDiv: 1,
      offsetDivs: -1.5,
      probeAttenuation: 1,
      waveform: 'square',
      frequencyHz: 1000,
      amplitudeV: 1.5,
      dcOffsetV: 0.5,
      dutyCycle: 0.35,
      phaseDeg: 45,
    },
  ]
}

export function createDefaultDigitalChannels(): DigitalChannelConfig[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `d${i}`,
    name: `D${i}`,
    kind: 'digital' as const,
    enabled: i < 4,
    color: DIGITAL_COLORS[i]!,
    // Protocol-like patterns; bit rates chosen to read clearly at ~50–500 µs/div
    waveform: (i < 2 ? 'i2c' : i < 4 ? 'spi' : 'uart') as DigitalChannelConfig['waveform'],
    frequencyHz: i < 2 ? 10_000 : i < 4 ? 25_000 : 9600,
    dutyCycle: 0.5,
    phaseDeg: i * 20,
    thresholdV: 1.65,
    bitIndex: i,
  }))
}

export function createDefaultTimebase(): TimebaseConfig {
  return {
    secondsPerDiv: 200e-6,
    sampleRateHz: 2_000_000,
    bufferSamples: 8192,
    positionPct: 50,
  }
}

export function createDefaultTrigger(): TriggerConfig {
  return {
    sourceId: 'ch1',
    slope: 'rising',
    levelV: 0,
    holdoffMs: 0,
  }
}
