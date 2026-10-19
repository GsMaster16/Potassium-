import { useEffect, useRef } from 'react'
import type {
  AnalogChannelConfig,
  CaptureFrame,
  ChannelConfig,
  CursorState,
  DigitalChannelConfig,
  TimebaseConfig,
  TriggerConfig,
} from '../engine/types'
import { DIVISIONS_H, DIVISIONS_V } from '../engine/types'
import { formatTime, formatVoltage } from '../engine/format'

interface ScopeCanvasProps {
  frame: CaptureFrame | null
  channels: ChannelConfig[]
  timebase: TimebaseConfig
  trigger: TriggerConfig
  cursors: CursorState
  showDigital: boolean
}

export function ScopeCanvas({
  frame,
  channels,
  timebase,
  trigger,
  cursors,
  showDigital,
}: ScopeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const cssW = wrap.clientWidth
      const cssH = wrap.clientHeight
      canvas.width = Math.max(1, Math.floor(cssW * dpr))
      canvas.height = Math.max(1, Math.floor(cssH * dpr))
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const w = cssW
      const h = cssH
      const analogChannels = channels.filter(
        (c): c is AnalogChannelConfig => c.kind === 'analog' && c.enabled,
      )
      const digitalChannels = showDigital
        ? channels.filter(
            (c): c is DigitalChannelConfig => c.kind === 'digital' && c.enabled,
          )
        : []

      const digitalBand = digitalChannels.length > 0 ? Math.min(0.38, 0.07 * digitalChannels.length + 0.12) : 0
      const analogH = h * (1 - digitalBand)
      const digitalY0 = analogH
      const digitalH = h - analogH

      // Atmosphere
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#0b1014')
      bg.addColorStop(0.55, '#101820')
      bg.addColorStop(1, '#0c1218')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Soft vignette
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.4, h * 0.1, w * 0.5, h * 0.5, h * 0.85)
      vig.addColorStop(0, 'rgba(40, 70, 90, 0.08)')
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.35)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      drawGraticule(ctx, w, analogH)
      if (digitalChannels.length > 0) {
        drawDigitalRail(ctx, 0, digitalY0, w, digitalH, digitalChannels.length)
      }

      if (frame) {
        for (const ch of analogChannels) {
          const samples = frame.analog[ch.id]
          if (!samples) continue
          drawAnalogTrace(ctx, samples, ch, w, analogH, timebase)
        }

        digitalChannels.forEach((ch, idx) => {
          const samples = frame.digital[ch.id]
          if (!samples) return
          const laneH = digitalH / digitalChannels.length
          const y = digitalY0 + idx * laneH
          drawDigitalTrace(ctx, samples, ch, w, y, laneH)
        })

        drawTriggerMarker(ctx, frame, trigger, channels, w, analogH, timebase)
      }

      if (cursors.enabled) {
        drawCursors(ctx, cursors, w, analogH, timebase)
      }

      drawReadouts(ctx, w, analogH, timebase, frame)
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [frame, channels, timebase, trigger, cursors, showDigital])

  return (
    <div className="scope-canvas-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="scope-canvas" aria-label="Waveform display" />
    </div>
  )
}

function drawGraticule(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const dx = w / DIVISIONS_H
  const dy = h / DIVISIONS_V

  ctx.save()
  ctx.strokeStyle = 'rgba(140, 170, 190, 0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= DIVISIONS_H; i++) {
    const x = i * dx
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
  }
  for (let j = 0; j <= DIVISIONS_V; j++) {
    const y = j * dy
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
  }
  ctx.stroke()

  // Center crosshair
  ctx.strokeStyle = 'rgba(180, 210, 230, 0.28)'
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()

  // Minor ticks on center axes
  ctx.strokeStyle = 'rgba(140, 170, 190, 0.2)'
  ctx.beginPath()
  for (let i = 0; i < DIVISIONS_H; i++) {
    for (let m = 1; m < 5; m++) {
      const x = i * dx + (m * dx) / 5
      ctx.moveTo(x, h / 2 - 4)
      ctx.lineTo(x, h / 2 + 4)
    }
  }
  for (let j = 0; j < DIVISIONS_V; j++) {
    for (let m = 1; m < 5; m++) {
      const y = j * dy + (m * dy) / 5
      ctx.moveTo(w / 2 - 4, y)
      ctx.lineTo(w / 2 + 4, y)
    }
  }
  ctx.stroke()
  ctx.restore()
}

function drawDigitalRail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lanes: number,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(8, 14, 20, 0.72)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(120, 150, 170, 0.25)'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.stroke()

  const laneH = h / lanes
  ctx.strokeStyle = 'rgba(120, 150, 170, 0.1)'
  ctx.beginPath()
  for (let i = 1; i < lanes; i++) {
    const ly = y + i * laneH
    ctx.moveTo(x, ly)
    ctx.lineTo(x + w, ly)
  }
  ctx.stroke()
  ctx.restore()
}

function drawAnalogTrace(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  ch: AnalogChannelConfig,
  w: number,
  h: number,
  timebase: TimebaseConfig,
) {
  if (samples.length < 2) return
  const midY = h / 2
  const pxPerVolt = (h / DIVISIONS_V) / ch.voltsPerDiv
  const offsetPx = ch.offsetDivs * (h / DIVISIONS_V)

  ctx.save()
  ctx.beginPath()
  ctx.lineWidth = 1.6
  ctx.strokeStyle = ch.color
  ctx.shadowColor = ch.color
  ctx.shadowBlur = 6
  ctx.globalAlpha = 0.95

  for (let i = 0; i < samples.length; i++) {
    const x = (i / (samples.length - 1)) * w
    const y = midY - samples[i]! * pxPerVolt - offsetPx
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Channel ground marker
  const gndY = midY - offsetPx
  ctx.shadowBlur = 0
  ctx.globalAlpha = 0.9
  ctx.fillStyle = ch.color
  ctx.beginPath()
  ctx.moveTo(0, gndY)
  ctx.lineTo(10, gndY - 6)
  ctx.lineTo(10, gndY + 6)
  ctx.closePath()
  ctx.fill()

  ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(ch.name, 14, gndY - 4)
  void timebase
  ctx.restore()
}

function drawDigitalTrace(
  ctx: CanvasRenderingContext2D,
  samples: Uint8Array,
  ch: DigitalChannelConfig,
  w: number,
  y0: number,
  laneH: number,
) {
  if (samples.length < 2) return
  const pad = laneH * 0.22
  const yHigh = y0 + pad
  const yLow = y0 + laneH - pad

  ctx.save()
  ctx.strokeStyle = ch.color
  ctx.lineWidth = 1.4
  ctx.shadowColor = ch.color
  ctx.shadowBlur = 4
  ctx.beginPath()

  let prev = samples[0]!
  let y = prev ? yHigh : yLow
  ctx.moveTo(0, y)

  for (let i = 1; i < samples.length; i++) {
    const x = (i / (samples.length - 1)) * w
    const bit = samples[i]!
    if (bit !== prev) {
      ctx.lineTo(x, y)
      y = bit ? yHigh : yLow
      ctx.lineTo(x, y)
      prev = bit
    }
  }
  ctx.lineTo(w, y)
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.fillStyle = ch.color
  ctx.font = '600 10px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(ch.name, 8, y0 + laneH * 0.55)
  ctx.restore()
}

function drawTriggerMarker(
  ctx: CanvasRenderingContext2D,
  frame: CaptureFrame,
  trigger: TriggerConfig,
  channels: ChannelConfig[],
  w: number,
  h: number,
  timebase: TimebaseConfig,
) {
  const x = frame.sampleCount > 1
    ? (frame.triggerIndex / (frame.sampleCount - 1)) * w
    : w / 2

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 120, 80, 0.85)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, h)
  ctx.stroke()
  ctx.setLineDash([])

  // Level marker on source channel if analog
  const src = channels.find((c) => c.id === trigger.sourceId)
  if (src?.kind === 'analog') {
    const midY = h / 2
    const pxPerVolt = (h / DIVISIONS_V) / src.voltsPerDiv
    const offsetPx = src.offsetDivs * (h / DIVISIONS_V)
    const y = midY - trigger.levelV * pxPerVolt - offsetPx
    ctx.fillStyle = 'rgba(255, 120, 80, 0.95)'
    ctx.beginPath()
    ctx.moveTo(w - 12, y)
    ctx.lineTo(w, y - 7)
    ctx.lineTo(w, y + 7)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255, 160, 120, 0.9)'
  ctx.font = '600 10px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText('T', x + 4, 14)
  void timebase
  ctx.restore()
}

function drawCursors(
  ctx: CanvasRenderingContext2D,
  cursors: CursorState,
  w: number,
  h: number,
  timebase: TimebaseConfig,
) {
  const windowS = timebase.secondsPerDiv * DIVISIONS_H
  const x1 = ((cursors.t1 + windowS / 2) / windowS) * w
  const x2 = ((cursors.t2 + windowS / 2) / windowS) * w
  const midY = h / 2
  // Use CH1-like 1V/div mapping for voltage cursors display-wise
  const y1 = midY - cursors.v1 * (h / DIVISIONS_V)
  const y2 = midY - cursors.v2 * (h / DIVISIONS_V)

  ctx.save()
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.7)'
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(x1, 0)
  ctx.lineTo(x1, h)
  ctx.moveTo(x2, 0)
  ctx.lineTo(x2, h)
  ctx.moveTo(0, y1)
  ctx.lineTo(w, y1)
  ctx.moveTo(0, y2)
  ctx.lineTo(w, y2)
  ctx.stroke()
  ctx.setLineDash([])

  const dt = Math.abs(cursors.t2 - cursors.t1)
  const dv = Math.abs(cursors.v2 - cursors.v1)
  ctx.fillStyle = 'rgba(180, 230, 255, 0.92)'
  ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(`Δt ${formatTime(dt)}`, Math.min(x1, x2) + 8, 28)
  ctx.fillText(`Δv ${formatVoltage(dv)}`, 12, Math.min(y1, y2) + 14)
  ctx.restore()
}

function drawReadouts(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timebase: TimebaseConfig,
  frame: CaptureFrame | null,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(170, 200, 220, 0.75)'
  ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillText(`${formatTime(timebase.secondsPerDiv)}/div`, 12, h - 10)
  if (frame) {
    const text = `${(frame.sampleRateHz / 1e6).toFixed(2)} MS/s · ${frame.sampleCount} pts`
    const tw = ctx.measureText(text).width
    ctx.fillText(text, w - tw - 12, h - 10)
  }
  ctx.restore()
}
