import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'

export default function FrequencyAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analysisRef = useStore((s) => s.analysisRef)
  const peaksRef = useRef<number[]>(new Array(48).fill(0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const a = analysisRef?.current
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      if (!a) return
      const spec = a.spectrum
      const bars = 48
      const step = Math.floor(spec.length / bars)
      const bw = (w - (bars - 1) * 1.5) / bars
      const peaks = peaksRef.current

      for (let i = 0; i < bars; i++) {
        // Logarithmic distribution: accurately spreads bass, mids, and treble across all bars
        const logIndex = Math.floor(Math.pow(i / (bars - 1), 2.2) * (spec.length * 0.45)) + 1
        const v = Math.min(1.0, ((spec[Math.min(spec.length - 1, logIndex)] || 0) / 255) * 1.35)
        const bh = Math.max(2, v * (h - 4))
        const x = i * (bw + 1.5)

        // Peak decay
        if (bh > peaks[i]) {
          peaks[i] = bh
        } else {
          peaks[i] = Math.max(0, peaks[i] - 0.6)
        }

        // Color coding by frequency region: bass (champagne), mid (silver), treble (subtle blue-gray)
        let color = '#C5A875'
        if (i >= 8 && i < 28) color = '#BFC3CA'
        else if (i >= 28) color = '#8EA0B5'

        ctx.fillStyle = color
        ctx.globalAlpha = 0.35 + v * 0.65
        ctx.beginPath()
        ctx.roundRect(x, h - bh, bw, bh, [1.5, 1.5, 0, 0])
        ctx.fill()

        // Peak dot
        if (peaks[i] > 4) {
          ctx.fillStyle = '#F3F1EC'
          ctx.globalAlpha = 0.8
          ctx.fillRect(x, h - peaks[i] - 1.5, bw, 1.5)
        }
      }
      ctx.globalAlpha = 1
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [analysisRef])

  return (
    <div className="w-full overflow-hidden rounded-lg bg-black/30 p-1">
      <canvas ref={canvasRef} width={220} height={52} className="w-full block" />
    </div>
  )
}
