import { Ruler, Waves, ArrowDownUp, Box, Layers } from 'lucide-react'
import { useAppStore, useProjectConfig, EndcapConstraint } from '../../stores/appStore'
import { depthToPressure, pressureToDepth } from '../../lib/optimizer'

function InputField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max
}: {
  label: string
  value: number
  onChange: (val: number) => void
  unit: string
  step?: number
  min?: number
  max?: number
}) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <div className="input-row">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          className="w-full"
        />
        <span className="unit">{unit}</span>
      </div>
    </div>
  )
}

export function ParametersView() {
  const config = useProjectConfig()
  const {
    setDepthM,
    setPressureMpa,
    setUseDirectPressure,
    setWaterDensity,
    setSafetyFactor,
    setMinDiameterMm,
    setMaxDiameterMm,
    setMinLengthMm,
    setMaxLengthMm,
    setDiameterStepMm,
    setLengthStepMm,
    setBoxEnabled,
    setBoxWidth,
    setBoxHeight,
    setBoxDepth,
    setBoxMaxCount,
    setBoxOrientation,
    setBoxForcedDiameter,
    setBoxForcedLength,
    setBoxPadding,
    setForcedWallThickness,
    setForcedEndcapThickness,
    setEndcapConstraint
  } = useAppStore()

  const handleDepthChange = (depth: number) => {
    setDepthM(depth)
    setPressureMpa(depthToPressure(depth, config.waterDensity))
  }

  const handlePressureChange = (pressure: number) => {
    setPressureMpa(pressure)
    setDepthM(pressureToDepth(pressure, config.waterDensity))
  }

  const handleWaterDensityChange = (density: number) => {
    setWaterDensity(density)
    if (!config.useDirectPressure) {
      setPressureMpa(depthToPressure(config.depthM, density))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-2">
        {/* Operating Conditions */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-4">
            <Waves size={14} className="text-vsc-accent" />
            Operating Conditions
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!config.useDirectPressure}
                  onChange={() => setUseDirectPressure(false)}
                  className="accent-vsc-accent"
                />
                <span className="text-sm text-vsc-fg-dim">Use Depth</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={config.useDirectPressure}
                  onChange={() => setUseDirectPressure(true)}
                  className="accent-vsc-accent"
                />
                <span className="text-sm text-vsc-fg-dim">Use Pressure</span>
              </label>
            </div>

            {!config.useDirectPressure ? (
              <InputField
                label="Operating Depth"
                value={config.depthM}
                onChange={handleDepthChange}
                unit="m"
                step={1}
                min={0}
              />
            ) : (
              <InputField
                label="External Pressure"
                value={config.pressureMpa}
                onChange={handlePressureChange}
                unit="MPa"
                step={0.01}
                min={0}
              />
            )}

            <div className="text-xs text-vsc-fg-muted px-1">
              {!config.useDirectPressure
                ? `= ${config.pressureMpa.toFixed(3)} MPa`
                : `= ${config.depthM.toFixed(1)} m depth`}
            </div>

            <InputField
              label="Water Density"
              value={config.waterDensity}
              onChange={handleWaterDensityChange}
              unit="kg/m³"
              step={1}
              min={900}
              max={1100}
            />

            <InputField
              label="Safety Factor"
              value={config.safetyFactor}
              onChange={setSafetyFactor}
              unit="×"
              step={0.1}
              min={1}
              max={10}
            />
          </div>
        </div>

        {/* Diameter Limits */}
        <div className="px-4 py-3 border-t border-vsc-border">
          <div className="flex items-center gap-2 text-sm font-medium mb-4">
            <Ruler size={14} className="text-vsc-accent" />
            Diameter Limits
          </div>
          
          <div className="space-y-3">
            <InputField
              label="Minimum Diameter"
              value={config.minDiameterMm}
              onChange={setMinDiameterMm}
              unit="mm"
              step={5}
              min={10}
            />
            <InputField
              label="Maximum Diameter"
              value={config.maxDiameterMm}
              onChange={setMaxDiameterMm}
              unit="mm"
              step={5}
              min={10}
            />
            <InputField
              label="Diameter Step"
              value={config.diameterStepMm}
              onChange={setDiameterStepMm}
              unit="mm"
              step={1}
              min={1}
            />
          </div>
        </div>

        {/* Length Limits */}
        <div className="px-4 py-3 border-t border-vsc-border">
          <div className="flex items-center gap-2 text-sm font-medium mb-4">
            <ArrowDownUp size={14} className="text-vsc-accent" />
            Length Limits
          </div>
          
          <div className="space-y-3">
            <InputField
              label="Minimum Length"
              value={config.minLengthMm}
              onChange={setMinLengthMm}
              unit="mm"
              step={10}
              min={10}
            />
            <InputField
              label="Maximum Length"
              value={config.maxLengthMm}
              onChange={setMaxLengthMm}
              unit="mm"
              step={10}
              min={10}
            />
            <InputField
              label="Length Step"
              value={config.lengthStepMm}
              onChange={setLengthStepMm}
              unit="mm"
              step={1}
              min={1}
            />
          </div>
        </div>

        {/* Cylinder Overrides */}
        <div className="px-4 py-3 border-t border-vsc-border">
          <div className="flex items-center gap-2 text-sm font-medium mb-4">
            <Layers size={14} className="text-vsc-accent" />
            Cylinder Overrides
          </div>
          
          <div className="space-y-3">
            <div className="text-xs text-vsc-fg-muted mb-2">
              Force dimensions (leave empty for auto)
            </div>
            
            {/* Diameter & Length */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-vsc-fg-dim block mb-1">Diameter</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="auto"
                    value={config.box?.forcedDiameterMm || ''}
                    onChange={(e) => setBoxForcedDiameter(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-vsc-input border border-vsc-border rounded px-2 py-1 text-sm"
                    step={1}
                    min={1}
                  />
                  <span className="text-xs text-vsc-fg-muted">mm</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-vsc-fg-dim block mb-1">Length</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="auto"
                    value={config.box?.forcedLengthMm || ''}
                    onChange={(e) => setBoxForcedLength(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-vsc-input border border-vsc-border rounded px-2 py-1 text-sm"
                    step={1}
                    min={1}
                  />
                  <span className="text-xs text-vsc-fg-muted">mm</span>
                </div>
              </div>
            </div>

            {/* Wall & Endcap Thickness */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-vsc-fg-dim block mb-1">Wall</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="auto"
                    value={config.forcedWallThicknessMm ?? ''}
                    onChange={(e) => setForcedWallThickness(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-vsc-input border border-vsc-border rounded px-2 py-1 text-sm"
                    step={0.1}
                    min={0.1}
                  />
                  <span className="text-xs text-vsc-fg-muted">mm</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-vsc-fg-dim block mb-1">Endcap</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="auto"
                    value={config.forcedEndcapThicknessMm ?? ''}
                    onChange={(e) => setForcedEndcapThickness(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-vsc-input border border-vsc-border rounded px-2 py-1 text-sm"
                    step={0.1}
                    min={0.1}
                  />
                  <span className="text-xs text-vsc-fg-muted">mm</span>
                </div>
              </div>
            </div>

            <div className="input-group mt-3">
              <label>Endcap Constraint</label>
              <select
                value={config.endcapConstraint}
                onChange={(e) => setEndcapConstraint(e.target.value as EndcapConstraint)}
                className="w-full bg-vsc-input border border-vsc-border rounded px-2 py-1 text-sm"
              >
                <option value="fixed">Fixed (clamped edges)</option>
                <option value="floating">Floating (simply supported)</option>
              </select>
              <div className="text-[10px] text-vsc-fg-muted mt-1">
                {config.endcapConstraint === 'fixed' 
                  ? 'Endcap edges are rigidly fixed to tube wall'
                  : 'Endcap edges can rotate freely at tube wall'}
              </div>
            </div>
          </div>
        </div>

        {/* Box Packing */}
        <div className="px-4 py-3 border-t border-vsc-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Box size={14} className="text-vsc-accent" />
              Box Packing
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.box?.enabled || false}
                onChange={(e) => setBoxEnabled(e.target.checked)}
                className="accent-vsc-accent"
              />
              <span className="text-xs text-vsc-fg-dim">Enable</span>
            </label>
          </div>
          
          {config.box?.enabled && (
            <div className="space-y-3">
              <div className="text-xs text-vsc-fg-muted mb-2">
                Hexagonal circle packing
              </div>
              <InputField
                label="Box Width (X)"
                value={config.box?.widthMm || 100}
                onChange={setBoxWidth}
                unit="mm"
                step={10}
                min={10}
              />
              <InputField
                label="Box Length (Y)"
                value={config.box?.heightMm || 100}
                onChange={setBoxHeight}
                unit="mm"
                step={10}
                min={10}
              />
              <InputField
                label="Box Height (Z)"
                value={config.box?.depthMm || 100}
                onChange={setBoxDepth}
                unit="mm"
                step={10}
                min={10}
              />
              <InputField
                label="Max Count"
                value={config.box?.maxCount || 0}
                onChange={setBoxMaxCount}
                unit=""
                step={1}
                min={0}
              />
              <InputField
                label="Radial Padding"
                value={config.box?.paddingMm || 0}
                onChange={setBoxPadding}
                unit="mm"
                step={0.5}
                min={0}
              />
              <div className="input-group">
                <label>Cylinder Axis</label>
                <select
                  value={config.box?.orientation || 'all'}
                  onChange={(e) => setBoxOrientation(e.target.value as 'all' | 'x' | 'y' | 'z')}
                  className="w-full bg-vsc-input border border-vsc-border rounded px-2 py-1 text-sm"
                >
                  <option value="all">All orientations</option>
                  <option value="x">X axis (width)</option>
                  <option value="y">Y axis (height)</option>
                  <option value="z">Z axis (depth)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
