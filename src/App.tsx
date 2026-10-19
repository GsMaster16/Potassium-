import { useEffect, useMemo, useRef, useState } from 'react'
import { ScopeCanvas } from './components/ScopeCanvas'
import { Controls } from './components/Controls'
import { acquireFrame, recommendedSampleRate } from './engine/capture'
import {
  createDefaultAnalogChannels,
  createDefaultDigitalChannels,
  createDefaultTimebase,
  createDefaultTrigger,
} from './engine/defaults'
import { formatFrequency, formatVoltage } from './engine/format'
import { measureAnalog, measureDigital } from './engine/measurements'
import type {
  CaptureFrame,
  ChannelConfig,
  CursorState,
  MeasurementResult,
  RunMode,
  TimebaseConfig,
  TriggerConfig,
} from './engine/types'
import './App.css'

export default function App() {
  const [runMode, setRunMode] = useState<RunMode>('run')
  const [showDigital, setShowDigital] = useState(true)
  const [channels, setChannels] = useState<ChannelConfig[]>(() => [
    ...createDefaultAnalogChannels(),
    ...createDefaultDigitalChannels(),
  ])
  const [timebase, setTimebase] = useState<TimebaseConfig>(() => createDefaultTimebase())
  const [trigger, setTrigger] = useState<TriggerConfig>(() => createDefaultTrigger())
  const [cursors, setCursors] = useState<CursorState>({
    enabled: false,
    t1: -200e-6,
    t2: 200e-6,
    v1: 1,
    v2: -1,
  })
  const [frame, setFrame] = useState<CaptureFrame | null>(null)
  const timeRef = useRef(0)
  const singlePending = useRef(false)

  const patchTimebase = (patch: Partial<TimebaseConfig>) => {
    setTimebase((tb) => {
      const next = { ...tb, ...patch }
      if (patch.secondsPerDiv != null) {
        next.sampleRateHz = recommendedSampleRate(next.secondsPerDiv)
      }
      return next
    })
  }

  const handleRunMode = (mode: RunMode) => {
    singlePending.current = mode === 'single'
    setRunMode(mode)
  }

  useEffect(() => {
    if (runMode === 'stop') return

    let raf = 0
    let last = performance.now()
    let alive = true

    const tick = (now: number) => {
      if (!alive) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      timeRef.current += dt
      setFrame(acquireFrame(channels, timebase, trigger, timeRef.current))

      if (runMode === 'single' || singlePending.current) {
        singlePending.current = false
        setRunMode('stop')
        return
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [runMode, channels, timebase, trigger])

  const measurements: MeasurementResult[] = useMemo(() => {
    if (!frame) return []
    const results: MeasurementResult[] = []
    for (const ch of channels) {
      if (!ch.enabled) continue
      if (ch.kind === 'analog') {
        const samples = frame.analog[ch.id]
        if (samples) results.push(measureAnalog(ch, samples, frame.sampleRateHz))
      } else if (showDigital) {
        const samples = frame.digital[ch.id]
        if (samples) results.push(measureDigital(ch, samples, frame.sampleRateHz))
      }
    }
    return results
  }, [frame, channels, showDigital])

  const triggerSources = channels
    .filter((c) => c.enabled)
    .map((c) => ({ id: c.id, name: c.name }))

  const patchChannel = (id: string, patch: Partial<ChannelConfig>) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? ({ ...ch, ...patch } as ChannelConfig) : ch)),
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>Potassium</h1>
            <p>Mixed-signal scope · logic analyzer</p>
          </div>
        </div>
        <div className="status-pills">
          <span className={`pill ${runMode}`}>{runMode.toUpperCase()}</span>
          <span className="pill muted">
            {showDigital ? 'MSO' : 'SCOPE'} · sim capture
          </span>
        </div>
      </header>

      <main className="workspace">
        <section className="display-panel">
          <ScopeCanvas
            frame={frame}
            channels={channels}
            timebase={timebase}
            trigger={trigger}
            cursors={cursors}
            showDigital={showDigital}
          />
          <div className="quick-meas">
            {measurements.slice(0, 4).map((m) => (
              <div key={m.channelId}>
                <strong>{m.channelName}</strong>
                <span>{formatFrequency(m.frequencyHz)}</span>
                {m.vpp != null && <span>{formatVoltage(m.vpp)}pp</span>}
              </div>
            ))}
          </div>
        </section>

        <Controls
          runMode={runMode}
          onRunMode={handleRunMode}
          timebase={timebase}
          onTimebase={patchTimebase}
          trigger={trigger}
          onTrigger={(patch) => setTrigger((t) => ({ ...t, ...patch }))}
          channels={channels}
          onChannel={patchChannel}
          cursors={cursors}
          onCursors={(patch) => setCursors((c) => ({ ...c, ...patch }))}
          showDigital={showDigital}
          onShowDigital={setShowDigital}
          measurements={measurements}
          triggerSources={triggerSources}
        />
      </main>
    </div>
  )
}
