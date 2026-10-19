export function formatTime(seconds: number): string {
  const abs = Math.abs(seconds)
  if (abs === 0) return '0 s'
  if (abs < 1e-6) return `${(seconds * 1e9).toFixed(2)} ns`
  if (abs < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`
  if (abs < 1) return `${(seconds * 1e3).toFixed(2)} ms`
  return `${seconds.toFixed(3)} s`
}

export function formatVoltage(volts: number): string {
  const abs = Math.abs(volts)
  if (abs === 0) return '0 V'
  if (abs < 1e-3) return `${(volts * 1e6).toFixed(2)} µV`
  if (abs < 1) return `${(volts * 1e3).toFixed(2)} mV`
  return `${volts.toFixed(3)} V`
}

export function formatFrequency(hz: number | null): string {
  if (hz == null || !Number.isFinite(hz) || hz <= 0) return '—'
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(3)} kHz`
  return `${hz.toFixed(2)} Hz`
}

export function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(1)} %`
}

export function formatSampleRate(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MS/s`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kS/s`
  return `${hz.toFixed(0)} S/s`
}
