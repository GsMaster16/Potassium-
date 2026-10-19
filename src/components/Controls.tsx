import type {
  ChannelConfig,
  CursorState,
  MeasurementResult,
  RunMode,
  TimebaseConfig,
  TriggerConfig,
  TriggerSlope,
  Waveform,
} from '../engine/types'
import {
  TIME_PER_DIV_OPTIONS,
  VOLTS_PER_DIV_OPTIONS,
} from '../engine/types'
import { formatFrequency, formatSampleRate, formatTime, formatVoltage } from '../engine/format'

interface ControlsProps {
  runMode: RunMode
  onRunMode: (mode: RunMode) => void
  timebase: TimebaseConfig
  onTimebase: (patch: Partial<TimebaseConfig>) => void
  trigger: TriggerConfig
  onTrigger: (patch: Partial<TriggerConfig>) => void
  channels: ChannelConfig[]
  onChannel: (id: string, patch: Partial<ChannelConfig>) => void
  cursors: CursorState
  onCursors: (patch: Partial<CursorState>) => void
  showDigital: boolean
  onShowDigital: (v: boolean) => void
  measurements: MeasurementResult[]
  triggerSources: { id: string; name: string }[]
}

const WAVEFORMS: Waveform[] = [
  'sine',
  'square',
  'triangle',
  'sawtooth',
  'noise',
  'pwm',
  'uart',
  'i2c',
  'spi',
]

export function Controls({
  runMode,
  onRunMode,
  timebase,
  onTimebase,
  trigger,
  onTrigger,
  channels,
  onChannel,
  cursors,
  onCursors,
  showDigital,
  onShowDigital,
  measurements,
  triggerSources,
}: ControlsProps) {
  const timeIdx = nearestIndex(TIME_PER_DIV_OPTIONS, timebase.secondsPerDiv)

  return (
    <aside className="controls">
      <section className="ctrl-block">
        <h2>Acquisition</h2>
        <div className="btn-row">
          <button
            type="button"
            className={runMode === 'run' ? 'active run' : 'run'}
            onClick={() => onRunMode('run')}
          >
            Run
          </button>
          <button
            type="button"
            className={runMode === 'stop' ? 'active' : ''}
            onClick={() => onRunMode('stop')}
          >
            Stop
          </button>
          <button
            type="button"
            className={runMode === 'single' ? 'active single' : 'single'}
            onClick={() => onRunMode('single')}
          >
            Single
          </button>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showDigital}
            onChange={(e) => onShowDigital(e.target.checked)}
          />
          Logic lanes
        </label>
      </section>

      <section className="ctrl-block">
        <h2>Timebase</h2>
        <label>
          Horizontal
          <div className="stepper">
            <button
              type="button"
              onClick={() =>
                onTimebase({
                  secondsPerDiv: TIME_PER_DIV_OPTIONS[Math.max(0, timeIdx - 1)],
                })
              }
            >
              −
            </button>
            <span>{formatTime(timebase.secondsPerDiv)}/div</span>
            <button
              type="button"
              onClick={() =>
                onTimebase({
                  secondsPerDiv:
                    TIME_PER_DIV_OPTIONS[
                      Math.min(TIME_PER_DIV_OPTIONS.length - 1, timeIdx + 1)
                    ],
                })
              }
            >
              +
            </button>
          </div>
        </label>
        <label>
          Position {timebase.positionPct.toFixed(0)}%
          <input
            type="range"
            min={10}
            max={90}
            value={timebase.positionPct}
            onChange={(e) => onTimebase({ positionPct: Number(e.target.value) })}
          />
        </label>
        <p className="meta">{formatSampleRate(timebase.sampleRateHz)}</p>
      </section>

      <section className="ctrl-block">
        <h2>Trigger</h2>
        <label>
          Source
          <select
            value={trigger.sourceId}
            onChange={(e) => onTrigger({ sourceId: e.target.value })}
          >
            {triggerSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Slope
          <select
            value={trigger.slope}
            onChange={(e) => onTrigger({ slope: e.target.value as TriggerSlope })}
          >
            <option value="rising">Rising</option>
            <option value="falling">Falling</option>
            <option value="either">Either</option>
          </select>
        </label>
        <label>
          Level {formatVoltage(trigger.levelV)}
          <input
            type="range"
            min={-5}
            max={5}
            step={0.05}
            value={trigger.levelV}
            onChange={(e) => onTrigger({ levelV: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="ctrl-block">
        <h2>Cursors</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={cursors.enabled}
            onChange={(e) => onCursors({ enabled: e.target.checked })}
          />
          Enable Δt / Δv
        </label>
        {cursors.enabled && (
          <>
            <label>
              t1
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={normalizeCursorT(cursors.t1, timebase)}
                onChange={(e) =>
                  onCursors({
                    t1: denormalizeCursorT(Number(e.target.value), timebase),
                  })
                }
              />
            </label>
            <label>
              t2
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={normalizeCursorT(cursors.t2, timebase)}
                onChange={(e) =>
                  onCursors({
                    t2: denormalizeCursorT(Number(e.target.value), timebase),
                  })
                }
              />
            </label>
            <label>
              v1 {formatVoltage(cursors.v1)}
              <input
                type="range"
                min={-4}
                max={4}
                step={0.05}
                value={cursors.v1}
                onChange={(e) => onCursors({ v1: Number(e.target.value) })}
              />
            </label>
            <label>
              v2 {formatVoltage(cursors.v2)}
              <input
                type="range"
                min={-4}
                max={4}
                step={0.05}
                value={cursors.v2}
                onChange={(e) => onCursors({ v2: Number(e.target.value) })}
              />
            </label>
          </>
        )}
      </section>

      <section className="ctrl-block channels">
        <h2>Channels</h2>
        {channels.map((ch) => (
          <ChannelEditor key={ch.id} channel={ch} onChange={onChannel} />
        ))}
      </section>

      <section className="ctrl-block">
        <h2>Measurements</h2>
        <div className="meas-grid">
          {measurements.length === 0 && <p className="meta">Enable a channel to measure.</p>}
          {measurements.map((m) => (
            <div key={m.channelId} className="meas-card">
              <strong>{m.channelName}</strong>
              <span>Freq {formatFrequency(m.frequencyHz)}</span>
              {m.vpp != null && <span>Vpp {formatVoltage(m.vpp)}</span>}
              {m.vrms != null && <span>Vrms {formatVoltage(m.vrms)}</span>}
              {m.dutyCycle != null && (
                <span>Duty {(m.dutyCycle * 100).toFixed(1)}%</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}

function ChannelEditor({
  channel,
  onChange,
}: {
  channel: ChannelConfig
  onChange: (id: string, patch: Partial<ChannelConfig>) => void
}) {
  const voltIdx =
    channel.kind === 'analog'
      ? nearestIndex(VOLTS_PER_DIV_OPTIONS, channel.voltsPerDiv)
      : 0

  return (
    <div className="channel-editor" style={{ borderColor: channel.color }}>
      <header>
        <label className="toggle">
          <input
            type="checkbox"
            checked={channel.enabled}
            onChange={(e) => onChange(channel.id, { enabled: e.target.checked })}
          />
          <span style={{ color: channel.color }}>{channel.name}</span>
        </label>
        <span className="kind">{channel.kind}</span>
      </header>

      {channel.enabled && (
        <div className="channel-fields">
          <label>
            Wave
            <select
              value={channel.waveform}
              onChange={(e) =>
                onChange(channel.id, { waveform: e.target.value as Waveform })
              }
            >
              {WAVEFORMS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <label>
            Freq {formatFrequency(channel.frequencyHz)}
            <input
              type="range"
              min={10}
              max={channel.kind === 'digital' ? 500_000 : 50_000}
              step={10}
              value={channel.frequencyHz}
              onChange={(e) =>
                onChange(channel.id, { frequencyHz: Number(e.target.value) })
              }
            />
          </label>

          {channel.kind === 'analog' && (
            <>
              <label>
                Scale
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() =>
                      onChange(channel.id, {
                        voltsPerDiv: VOLTS_PER_DIV_OPTIONS[Math.max(0, voltIdx - 1)],
                      })
                    }
                  >
                    −
                  </button>
                  <span>{formatVoltage(channel.voltsPerDiv)}/div</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(channel.id, {
                        voltsPerDiv:
                          VOLTS_PER_DIV_OPTIONS[
                            Math.min(VOLTS_PER_DIV_OPTIONS.length - 1, voltIdx + 1)
                          ],
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </label>
              <label>
                Amp {formatVoltage(channel.amplitudeV)}
                <input
                  type="range"
                  min={0.05}
                  max={5}
                  step={0.05}
                  value={channel.amplitudeV}
                  onChange={(e) =>
                    onChange(channel.id, { amplitudeV: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Offset {channel.offsetDivs.toFixed(1)} div
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={0.1}
                  value={channel.offsetDivs}
                  onChange={(e) =>
                    onChange(channel.id, { offsetDivs: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Duty {(channel.dutyCycle * 100).toFixed(0)}%
                <input
                  type="range"
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  value={channel.dutyCycle}
                  onChange={(e) =>
                    onChange(channel.id, { dutyCycle: Number(e.target.value) })
                  }
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function nearestIndex(options: readonly number[], value: number): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < options.length; i++) {
    const d = Math.abs(options[i]! - value)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

function normalizeCursorT(t: number, timebase: TimebaseConfig): number {
  const half = (timebase.secondsPerDiv * 10) / 2
  return Math.max(-1, Math.min(1, t / half))
}

function denormalizeCursorT(n: number, timebase: TimebaseConfig): number {
  const half = (timebase.secondsPerDiv * 10) / 2
  return n * half
}
