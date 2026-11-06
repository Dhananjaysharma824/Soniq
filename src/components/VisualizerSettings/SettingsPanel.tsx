import { useStore, type QualityLevel } from '@/store/useStore'

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-text-secondary">
        <span>{label}</span>
        <span className="text-text-primary font-medium">{value.toFixed(2)}x</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

export default function SettingsPanel() {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)

  return (
    <div className="space-y-4 text-text-primary">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-champagne mb-2">
          Audio Response
        </div>
        <SliderRow
          label="Bass Sensitivity"
          value={settings.bassSensitivity}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => update({ bassSensitivity: v })}
        />
        <SliderRow
          label="Midrange Sensitivity"
          value={settings.midSensitivity}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => update({ midSensitivity: v })}
        />
        <SliderRow
          label="Treble Sensitivity"
          value={settings.trebleSensitivity}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => update({ trebleSensitivity: v })}
        />
        <SliderRow
          label="Beat Detection Impulse"
          value={settings.beatIntensity}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => update({ beatIntensity: v })}
        />
      </div>

      <div className="border-t border-white/[0.06] pt-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-champagne mb-2">
          3D Physics & Camera
        </div>
        <SliderRow
          label="Sculpture Deformation"
          value={settings.deformation}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => update({ deformation: v })}
        />
        <SliderRow
          label="Particle Density"
          value={settings.particleDensity}
          min={0.2}
          max={1.5}
          step={0.05}
          onChange={(v) => update({ particleDensity: v })}
        />
        <SliderRow
          label="Camera Reactivity"
          value={settings.cameraMotion}
          min={0}
          max={1.5}
          step={0.05}
          onChange={(v) => update({ cameraMotion: v })}
        />
      </div>

      <div className="border-t border-white/[0.06] pt-3 space-y-2.5">
        <div>
          <label className="block font-mono text-[10px] text-text-secondary mb-1">
            Rendering Profile
          </label>
          <select
            value={settings.quality}
            onChange={(e) => update({ quality: e.target.value as QualityLevel })}
            className="w-full rounded-lg border border-white/[0.08] bg-surface px-3 py-1.5 font-sans text-xs text-text-primary outline-none focus:border-champagne/40"
          >
            <option value="low">Low (Battery Saver / Low GPU)</option>
            <option value="medium">Medium (Standard)</option>
            <option value="high">High (Post-processing Bloom & Vignette)</option>
            <option value="ultra">Ultra (Max resolution & anti-aliasing)</option>
          </select>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => update({ reducedMotion: e.target.checked })}
            className="rounded"
          />
          <span className="font-sans text-xs text-text-secondary">Reduced motion mode</span>
        </label>
      </div>
    </div>
  )
}
