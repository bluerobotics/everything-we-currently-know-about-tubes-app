import { useState } from 'react'
import {
  BarChart3,
  Grid3X3,
  Circle,
  Spline,
  Download,
  ZoomOut,
  ChevronDown,
  ChevronRight,
  Axis3D,
  Eye,
  Database,
  RotateCcw,
  LineChart,
  Layers,
  AlertCircle,
} from 'lucide-react'
import {
  useAppStore,
  useActivePanelConfig,
  COLUMN_LABELS,
  DEFAULT_CHART_CONFIG,
  type DataColumn,
  type ScaleType,
  type LabelFormat,
  type DashPattern,
  type PointShape,
  type Interpolation,
  type LegendPosition,
  type TooltipMode,
  type ZoomMode,
  type GridStyle,
  type DuplicateColumnHandling,
  type SegmentMode,
  type NullHandling,
  type DownsamplingMethod,
  type AxisConfig,
  type SecondaryYAxisConfig,
  type DisplayConfig,
  type DataConfig,
} from '../../stores/appStore'

// ============================================================================
// Constants
// ============================================================================

const COLUMNS: { value: DataColumn; label: string }[] = [
  { value: 'time', label: 'Time (s)' },
  { value: 'pwm', label: 'PWM (μs)' },
  { value: 'loadCell', label: 'Load Cell (g)' },
  { value: 'thrust', label: 'Thrust (g)' },
  { value: 'voltage', label: 'Voltage (V)' },
  { value: 'current', label: 'Current (A)' },
  { value: 'rpm', label: 'RPM' },
  { value: 'efficiency', label: 'Efficiency (g/W)' },
]

const SCALE_TYPES: { value: ScaleType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'log', label: 'Logarithmic' },
  { value: 'symlog', label: 'Symmetric Log' },
]

const LABEL_FORMATS: { value: LabelFormat; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'decimal0', label: '0 decimals' },
  { value: 'decimal1', label: '1 decimal' },
  { value: 'decimal2', label: '2 decimals' },
  { value: 'decimal3', label: '3 decimals' },
  { value: 'scientific', label: 'Scientific' },
  { value: 'engineering', label: 'Engineering' },
]

const DASH_PATTERNS: { value: DashPattern; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'dashDot', label: 'Dash-Dot' },
]

const POINT_SHAPES: { value: PointShape; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'diamond', label: 'Diamond' },
]

const INTERPOLATIONS: { value: Interpolation; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'spline', label: 'Spline (Smooth)' },
  { value: 'stepBefore', label: 'Step Before' },
  { value: 'stepAfter', label: 'Step After' },
]

const LEGEND_POSITIONS: { value: LegendPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'none', label: 'Hidden' },
]

const TOOLTIP_MODES: { value: TooltipMode; label: string }[] = [
  { value: 'nearest', label: 'Nearest Point' },
  { value: 'all', label: 'All Series' },
  { value: 'none', label: 'Disabled' },
]

const ZOOM_MODES: { value: ZoomMode; label: string }[] = [
  { value: 'xy', label: 'Both Axes' },
  { value: 'x', label: 'X-Axis Only' },
  { value: 'y', label: 'Y-Axis Only' },
  { value: 'none', label: 'Disabled' },
]

const GRID_STYLES: { value: GridStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
]

const DUPLICATE_HANDLING: { value: DuplicateColumnHandling; label: string }[] = [
  { value: 'first', label: 'Use First' },
  { value: 'last', label: 'Use Last' },
  { value: 'average', label: 'Average' },
  { value: 'both', label: 'Both as Separate' },
]

const SEGMENT_MODES: { value: SegmentMode; label: string }[] = [
  { value: 'continuous', label: 'Continuous' },
  { value: 'separate', label: 'Separate Segments' },
]

const NULL_HANDLING: { value: NullHandling; label: string }[] = [
  { value: 'skip', label: 'Skip (Gap)' },
  { value: 'interpolate', label: 'Interpolate' },
  { value: 'zero', label: 'Treat as Zero' },
]

const DOWNSAMPLING_METHODS: { value: DownsamplingMethod; label: string }[] = [
  { value: 'lttb', label: 'LTTB (Best Quality)' },
  { value: 'minmax', label: 'Min-Max' },
  { value: 'average', label: 'Average' },
  { value: 'none', label: 'None (All Points)' },
]

// ============================================================================
// Collapsible Section Component
// ============================================================================

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-vsc-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-vsc-highlight transition-colors"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-vsc-fg-dim">{icon}</span>
        <span className="text-sm font-medium text-vsc-fg">{title}</span>
      </button>
      {isOpen && <div className="pb-3">{children}</div>}
    </div>
  )
}

// ============================================================================
// Form Control Components
// ============================================================================

interface SelectFieldProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  helpText?: string
}

function SelectField({ label, value, options, onChange, helpText }: SelectFieldProps) {
  return (
    <div className="px-4 py-1.5">
      <label className="block text-xs text-vsc-fg-dim mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 bg-vsc-input border border-vsc-border rounded text-sm text-vsc-fg focus:border-vsc-accent focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helpText && <p className="text-xs text-vsc-fg-muted mt-1">{helpText}</p>}
    </div>
  )
}

interface CheckboxFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: React.ReactNode
}

function CheckboxField({ label, checked, onChange, icon }: CheckboxFieldProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(!checked)
  }

  return (
    <div 
      className="flex items-center gap-3 px-4 py-1.5 hover:bg-vsc-highlight cursor-pointer group"
      onClick={handleClick}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
    >
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
          checked
            ? 'bg-vsc-accent border-vsc-accent'
            : 'border-vsc-fg-muted group-hover:border-vsc-fg-dim'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5L4 7L8 3"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {icon && <span className="text-vsc-fg-dim group-hover:text-vsc-fg flex-shrink-0">{icon}</span>}
      {label && <span className="text-sm text-vsc-fg">{label}</span>}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
}

function NumberField({ label, value, onChange, min, max, step = 1, placeholder, disabled }: NumberFieldProps) {
  return (
    <div className="px-4 py-1.5">
      <label className="block text-xs text-vsc-fg-dim mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-2 py-1.5 bg-vsc-input border border-vsc-border rounded text-sm text-vsc-fg focus:border-vsc-accent focus:outline-none disabled:opacity-50"
      />
    </div>
  )
}

interface SliderFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
}

function SliderField({ label, value, onChange, min, max, step = 1, unit }: SliderFieldProps) {
  return (
    <div className="px-4 py-1.5">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-vsc-fg-dim">{label}</label>
        <span className="text-xs text-vsc-fg-muted font-mono">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full accent-vsc-accent"
      />
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="px-4 py-1.5">
      <label className="block text-xs text-vsc-fg-dim mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-vsc-border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-vsc-input border border-vsc-border rounded text-sm text-vsc-fg font-mono focus:border-vsc-accent focus:outline-none"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function GraphConfigView() {
  const {
    updatePanelChartConfig,
    getSeriesConfig,
    getActiveTab,
  } = useAppStore()

  // Get active tab and panel config
  const activeTab = getActiveTab()
  const activePanel = useActivePanelConfig()
  const activePanelId = activeTab?.activePanelId || null
  const chartConfig = activePanel?.chartConfig ?? DEFAULT_CHART_CONFIG

  const { xAxis, yAxis, y2Axis, display, data } = chartConfig

  // Get all runs for series configuration - use panel's selections
  const testSessions = activeTab?.testSessions || []
  const allRuns = testSessions.flatMap((s) => s.runs)
  const panelSelectedRunIds = activePanel?.selectedRunIds ?? []
  const panelSelectedSegmentIds = activePanel?.selectedSegmentIds ?? []
  
  // Get runs that are selected for this panel (either as full runs or segments)
  const selectedRuns = allRuns.filter((r) => 
    panelSelectedRunIds.includes(r.id) || 
    panelSelectedSegmentIds.some(sid => sid.startsWith(`${r.id}:segment-`))
  )

  // Helper to update panel chart config with partial axis updates
  const updateXAxis = (config: Partial<AxisConfig>) => {
    if (!activePanelId) return
    updatePanelChartConfig(activePanelId, { 
      xAxis: { ...chartConfig.xAxis, ...config } 
    })
  }

  const updateYAxis = (config: Partial<AxisConfig>) => {
    if (!activePanelId) return
    updatePanelChartConfig(activePanelId, { 
      yAxis: { ...chartConfig.yAxis, ...config } 
    })
  }

  const updateY2Axis = (config: Partial<SecondaryYAxisConfig>) => {
    if (!activePanelId) return
    updatePanelChartConfig(activePanelId, { 
      y2Axis: { ...chartConfig.y2Axis, ...config } 
    })
  }

  const updateDisplay = (config: Partial<DisplayConfig>) => {
    if (!activePanelId) return
    updatePanelChartConfig(activePanelId, { 
      display: { ...chartConfig.display, ...config } 
    })
  }

  const updateData = (config: Partial<DataConfig>) => {
    if (!activePanelId) return
    updatePanelChartConfig(activePanelId, { 
      data: { ...chartConfig.data, ...config } 
    })
  }

  const updateSeriesConfig = (runId: string, config: Partial<typeof chartConfig.seriesConfigs[string]>) => {
    if (!activePanelId) return
    updatePanelChartConfig(activePanelId, { 
      seriesConfigs: {
        ...chartConfig.seriesConfigs,
        [runId]: {
          ...chartConfig.seriesConfigs[runId],
          ...config,
        }
      }
    })
  }

  const resetPanelChartConfig = () => {
    if (!activePanelId) return
    updatePanelChartConfig(activePanelId, { ...DEFAULT_CHART_CONFIG })
  }

  // Disabled state when no panel is selected
  const isDisabled = !activePanel

  return (
    <div className="flex flex-col h-full">
      {/* Panel indicator */}
      {activePanel ? (
        <div className="px-4 py-2 border-b border-vsc-border bg-vsc-bg-light">
          <span className="text-xs text-vsc-fg-dim">Editing:</span>
          <span className="ml-2 text-sm text-vsc-fg font-medium">{activePanel.name}</span>
        </div>
      ) : (
        <div className="px-4 py-4 border-b border-vsc-border bg-vsc-bg-light">
          <div className="flex items-center gap-2 text-vsc-fg-muted">
            <AlertCircle size={16} />
            <span className="text-sm">No panel selected</span>
          </div>
          <p className="text-xs text-vsc-fg-dim mt-1">
            Click on a chart panel to select it for editing
          </p>
        </div>
      )}

      <div className={`flex-1 overflow-auto ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* X-Axis Configuration */}
        <CollapsibleSection title="X-Axis" icon={<Axis3D size={14} />} defaultOpen>
          <SelectField
            label="Data Column"
            value={xAxis.column}
            options={COLUMNS}
            onChange={(v) => updateXAxis({ column: v as DataColumn, label: COLUMN_LABELS[v as DataColumn] })}
          />
          <SelectField
            label="Scale Type"
            value={xAxis.scaleType}
            options={SCALE_TYPES}
            onChange={(v) => updateXAxis({ scaleType: v as ScaleType })}
          />
          <CheckboxField
            label="Auto Range"
            checked={xAxis.autoRange}
            onChange={(v) => updateXAxis({ autoRange: v })}
          />
          {!xAxis.autoRange && (
            <div className="grid grid-cols-2 gap-2 px-4">
              <NumberField
                label="Min"
                value={xAxis.min}
                onChange={(v) => updateXAxis({ min: v })}
                placeholder="Auto"
              />
              <NumberField
                label="Max"
                value={xAxis.max}
                onChange={(v) => updateXAxis({ max: v })}
                placeholder="Auto"
              />
            </div>
          )}
          <SelectField
            label="Label Format"
            value={xAxis.labelFormat}
            options={LABEL_FORMATS}
            onChange={(v) => updateXAxis({ labelFormat: v as LabelFormat })}
          />
          <CheckboxField
            label="Show Axis"
            checked={xAxis.showAxis}
            onChange={(v) => updateXAxis({ showAxis: v })}
          />
          <CheckboxField
            label="Cursor Snapping"
            checked={xAxis.cursorSnapEnabled}
            onChange={(v) => updateXAxis({ cursorSnapEnabled: v })}
          />
          {xAxis.cursorSnapEnabled && (
            <NumberField
              label="Snap Interval"
              value={xAxis.cursorSnapInterval}
              onChange={(v) => updateXAxis({ cursorSnapInterval: v ?? 0.1 })}
              min={0.001}
              step={0.1}
              placeholder="0.1"
            />
          )}
        </CollapsibleSection>

        {/* Y-Axis Configuration */}
        <CollapsibleSection title="Y-Axis (Primary)" icon={<BarChart3 size={14} />} defaultOpen>
          <SelectField
            label="Data Column"
            value={yAxis.column}
            options={COLUMNS}
            onChange={(v) => updateYAxis({ column: v as DataColumn, label: COLUMN_LABELS[v as DataColumn] })}
          />
          <SelectField
            label="Scale Type"
            value={yAxis.scaleType}
            options={SCALE_TYPES}
            onChange={(v) => updateYAxis({ scaleType: v as ScaleType })}
          />
          <CheckboxField
            label="Auto Range"
            checked={yAxis.autoRange}
            onChange={(v) => updateYAxis({ autoRange: v })}
          />
          {!yAxis.autoRange && (
            <div className="grid grid-cols-2 gap-2 px-4">
              <NumberField
                label="Min"
                value={yAxis.min}
                onChange={(v) => updateYAxis({ min: v })}
                placeholder="Auto"
              />
              <NumberField
                label="Max"
                value={yAxis.max}
                onChange={(v) => updateYAxis({ max: v })}
                placeholder="Auto"
              />
            </div>
          )}
          <SelectField
            label="Label Format"
            value={yAxis.labelFormat}
            options={LABEL_FORMATS}
            onChange={(v) => updateYAxis({ labelFormat: v as LabelFormat })}
          />
          <CheckboxField
            label="Show Axis"
            checked={yAxis.showAxis}
            onChange={(v) => updateYAxis({ showAxis: v })}
          />
        </CollapsibleSection>

        {/* Secondary Y-Axis Configuration */}
        <CollapsibleSection title="Y-Axis (Secondary)" icon={<Layers size={14} />}>
          <CheckboxField
            label="Enable Secondary Y-Axis"
            checked={y2Axis.enabled}
            onChange={(v) => updateY2Axis({ enabled: v })}
          />
          {y2Axis.enabled && (
            <>
              <SelectField
                label="Data Column"
                value={y2Axis.column}
                options={COLUMNS}
                onChange={(v) => updateY2Axis({ column: v as DataColumn, label: COLUMN_LABELS[v as DataColumn] })}
              />
              <SelectField
                label="Scale Type"
                value={y2Axis.scaleType}
                options={SCALE_TYPES}
                onChange={(v) => updateY2Axis({ scaleType: v as ScaleType })}
              />
              <CheckboxField
                label="Auto Range"
                checked={y2Axis.autoRange}
                onChange={(v) => updateY2Axis({ autoRange: v })}
              />
              {!y2Axis.autoRange && (
                <div className="grid grid-cols-2 gap-2 px-4">
                  <NumberField
                    label="Min"
                    value={y2Axis.min}
                    onChange={(v) => updateY2Axis({ min: v })}
                    placeholder="Auto"
                  />
                  <NumberField
                    label="Max"
                    value={y2Axis.max}
                    onChange={(v) => updateY2Axis({ max: v })}
                    placeholder="Auto"
                  />
                </div>
              )}
              <SelectField
                label="Label Format"
                value={y2Axis.labelFormat}
                options={LABEL_FORMATS}
                onChange={(v) => updateY2Axis({ labelFormat: v as LabelFormat })}
              />
            </>
          )}
        </CollapsibleSection>

        {/* Series Configuration */}
        <CollapsibleSection title="Series / Lines" icon={<LineChart size={14} />}>
          {selectedRuns.length === 0 ? (
            <p className="px-4 text-xs text-vsc-fg-muted">
              {activePanel ? 'Select runs in this panel to configure series' : 'No panel selected'}
            </p>
          ) : (
            selectedRuns.map((run) => {
              const config = getSeriesConfig(run.id)
              return (
                <div key={run.id} className="border-b border-vsc-border last:border-b-0 py-2">
                  <div className="px-4 flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm font-medium text-vsc-fg truncate">{run.name}</span>
                    <CheckboxField
                      label=""
                      checked={config.visible}
                      onChange={(v) => updateSeriesConfig(run.id, { visible: v })}
                      icon={<Eye size={12} />}
                    />
                  </div>
                  
                  <ColorField
                    label="Color"
                    value={config.color}
                    onChange={(v) => updateSeriesConfig(run.id, { color: v })}
                  />
                  
                  <SliderField
                    label="Line Width"
                    value={config.lineWidth}
                    onChange={(v) => updateSeriesConfig(run.id, { lineWidth: v })}
                    min={1}
                    max={5}
                    step={0.5}
                    unit="px"
                  />
                  
                  <SelectField
                    label="Line Style"
                    value={config.dashPattern}
                    options={DASH_PATTERNS}
                    onChange={(v) => updateSeriesConfig(run.id, { dashPattern: v as DashPattern })}
                  />
                  
                  <SelectField
                    label="Interpolation"
                    value={config.interpolation}
                    options={INTERPOLATIONS}
                    onChange={(v) => updateSeriesConfig(run.id, { interpolation: v as Interpolation })}
                  />
                  
                  <CheckboxField
                    label="Show Points"
                    checked={config.showPoints}
                    onChange={(v) => updateSeriesConfig(run.id, { showPoints: v })}
                    icon={<Circle size={12} />}
                  />
                  
                  {config.showPoints && (
                    <>
                      <SliderField
                        label="Point Size"
                        value={config.pointSize}
                        onChange={(v) => updateSeriesConfig(run.id, { pointSize: v })}
                        min={2}
                        max={10}
                        unit="px"
                      />
                      <SelectField
                        label="Point Shape"
                        value={config.pointShape}
                        options={POINT_SHAPES}
                        onChange={(v) => updateSeriesConfig(run.id, { pointShape: v as PointShape })}
                      />
                    </>
                  )}
                  
                  <CheckboxField
                    label="Fill Area"
                    checked={config.fillArea}
                    onChange={(v) => updateSeriesConfig(run.id, { fillArea: v })}
                  />
                  
                  {config.fillArea && (
                    <SliderField
                      label="Fill Opacity"
                      value={config.fillOpacity}
                      onChange={(v) => updateSeriesConfig(run.id, { fillOpacity: v })}
                      min={0}
                      max={100}
                      unit="%"
                    />
                  )}
                  
                  <CheckboxField
                    label="Connect Gaps"
                    checked={config.connectGaps}
                    onChange={(v) => updateSeriesConfig(run.id, { connectGaps: v })}
                  />
                  
                  {y2Axis.enabled && (
                    <SelectField
                      label="Y-Axis"
                      value={config.yAxisId}
                      options={[
                        { value: 'y', label: 'Primary (Left)' },
                        { value: 'y2', label: 'Secondary (Right)' },
                      ]}
                      onChange={(v) => updateSeriesConfig(run.id, { yAxisId: v as 'y' | 'y2' })}
                    />
                  )}
                </div>
              )
            })
          )}
        </CollapsibleSection>

        {/* Display Configuration */}
        <CollapsibleSection title="Display Options" icon={<Eye size={14} />} defaultOpen>
          <CheckboxField
            label="Show X-Grid"
            checked={display.showGridX}
            onChange={(v) => updateDisplay({ showGridX: v })}
            icon={<Grid3X3 size={12} />}
          />
          {display.showGridX && (
            <NumberField
              label="X-Grid Interval (data units)"
              value={display.gridIntervalX}
              onChange={(v) => updateDisplay({ gridIntervalX: v })}
              min={0.001}
              step={0.1}
              placeholder="Auto"
            />
          )}
          <CheckboxField
            label="Show Y-Grid"
            checked={display.showGridY}
            onChange={(v) => updateDisplay({ showGridY: v })}
            icon={<Grid3X3 size={12} />}
          />
          {display.showGridY && (
            <NumberField
              label="Y-Grid Interval (data units)"
              value={display.gridIntervalY}
              onChange={(v) => updateDisplay({ gridIntervalY: v })}
              min={0.001}
              step={1}
              placeholder="Auto"
            />
          )}
          <SelectField
            label="Grid Style"
            value={display.gridStyle}
            options={GRID_STYLES}
            onChange={(v) => updateDisplay({ gridStyle: v as GridStyle })}
          />
          <SliderField
            label="Grid Opacity"
            value={display.gridOpacity}
            onChange={(v) => updateDisplay({ gridOpacity: v })}
            min={0}
            max={100}
            unit="%"
          />
          <SelectField
            label="Legend Position"
            value={display.legendPosition}
            options={LEGEND_POSITIONS}
            onChange={(v) => updateDisplay({ legendPosition: v as LegendPosition })}
          />
          <CheckboxField
            label="Live Legend (Show Values)"
            checked={display.legendLive}
            onChange={(v) => updateDisplay({ legendLive: v })}
          />
          <SelectField
            label="Tooltip Mode"
            value={display.tooltipMode}
            options={TOOLTIP_MODES}
            onChange={(v) => updateDisplay({ tooltipMode: v as TooltipMode })}
          />
          <CheckboxField
            label="Show Crosshair"
            checked={display.showCrosshair}
            onChange={(v) => updateDisplay({ showCrosshair: v })}
          />
          <CheckboxField
            label="Show Cursor Markers"
            checked={display.showCursorMarkers}
            onChange={(v) => updateDisplay({ showCursorMarkers: v })}
          />
          {display.showCursorMarkers && (
            <SliderField
              label="Marker Size"
              value={display.cursorMarkerSize}
              onChange={(v) => updateDisplay({ cursorMarkerSize: v })}
              min={2}
              max={12}
              step={1}
              unit="px"
            />
          )}
          <SelectField
            label="Zoom Mode"
            value={display.zoomMode}
            options={ZOOM_MODES}
            onChange={(v) => updateDisplay({ zoomMode: v as ZoomMode })}
          />
          <ColorField
            label="Background Color"
            value={display.backgroundColor}
            onChange={(v) => updateDisplay({ backgroundColor: v })}
          />
        </CollapsibleSection>

        {/* Data Configuration */}
        <CollapsibleSection title="Data Processing" icon={<Database size={14} />}>
          <SelectField
            label="Duplicate Column Handling"
            value={data.duplicateColumnHandling}
            options={DUPLICATE_HANDLING}
            onChange={(v) => updateData({ duplicateColumnHandling: v as DuplicateColumnHandling })}
            helpText="How to handle columns with the same name (e.g., two Thrust columns)"
          />
          <SelectField
            label="Segment Mode"
            value={data.segmentMode}
            options={SEGMENT_MODES}
            onChange={(v) => updateData({ segmentMode: v as SegmentMode })}
            helpText="How to handle files with multiple header rows"
          />
          <SelectField
            label="Null/Missing Data"
            value={data.nullHandling}
            options={NULL_HANDLING}
            onChange={(v) => updateData({ nullHandling: v as NullHandling })}
          />
          <SelectField
            label="Downsampling Method"
            value={data.downsamplingMethod}
            options={DOWNSAMPLING_METHODS}
            onChange={(v) => updateData({ downsamplingMethod: v as DownsamplingMethod })}
            helpText="Algorithm used to reduce data points for display"
          />
          {data.downsamplingMethod !== 'none' && (
            <NumberField
              label="Max Display Points"
              value={data.maxPoints}
              onChange={(v) => updateData({ maxPoints: v ?? 2000 })}
              min={100}
              max={10000}
              step={100}
            />
          )}
        </CollapsibleSection>

        {/* Actions */}
        <CollapsibleSection title="Actions" icon={<ZoomOut size={14} />} defaultOpen>
          <div className="px-4 space-y-2">
            <button
              onClick={() => {}}
              disabled={isDisabled}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border rounded text-sm text-vsc-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              Export as PNG
            </button>

            <button
              onClick={resetPanelChartConfig}
              disabled={isDisabled}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border rounded text-sm text-vsc-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} />
              Reset Panel Settings
            </button>
          </div>
        </CollapsibleSection>

        {/* Keyboard Shortcuts */}
        <CollapsibleSection title="Keyboard Shortcuts" icon={<Spline size={14} />}>
          <div className="px-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-vsc-fg-dim">
              <span>Toggle grid</span>
              <kbd className="px-1.5 py-0.5 bg-vsc-bg-dark rounded text-vsc-fg-muted font-mono">G</kbd>
            </div>
            <div className="flex justify-between text-vsc-fg-dim">
              <span>Toggle points</span>
              <kbd className="px-1.5 py-0.5 bg-vsc-bg-dark rounded text-vsc-fg-muted font-mono">P</kbd>
            </div>
            <div className="flex justify-between text-vsc-fg-dim">
              <span>Toggle smooth</span>
              <kbd className="px-1.5 py-0.5 bg-vsc-bg-dark rounded text-vsc-fg-muted font-mono">S</kbd>
            </div>
            <div className="flex justify-between text-vsc-fg-dim">
              <span>Reset zoom</span>
              <kbd className="px-1.5 py-0.5 bg-vsc-bg-dark rounded text-vsc-fg-muted font-mono">R</kbd>
            </div>
            <div className="flex justify-between text-vsc-fg-dim">
              <span>Open folder</span>
              <kbd className="px-1.5 py-0.5 bg-vsc-bg-dark rounded text-vsc-fg-muted font-mono">Ctrl+O</kbd>
            </div>
            <div className="flex justify-between text-vsc-fg-dim">
              <span>Toggle sidebar</span>
              <kbd className="px-1.5 py-0.5 bg-vsc-bg-dark rounded text-vsc-fg-muted font-mono">Ctrl+B</kbd>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
