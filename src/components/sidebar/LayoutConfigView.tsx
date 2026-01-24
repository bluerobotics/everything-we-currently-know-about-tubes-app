import { useState, useCallback } from 'react'
import {
  LayoutGrid,
  Layers,
  Settings,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Download,
  Check,
  Merge,
  Split,
  Grid3X3,
} from 'lucide-react'
import {
  useAppStore,
  useActiveTab,
  canMergeGridAreas,
  type LayoutType,
  type PanelConfig,
  type ViewPreset,
  type GridArea,
} from '../../stores/appStore'

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
// Layout Type Button Component
// ============================================================================

interface LayoutTypeButtonProps {
  type: LayoutType
  label: string
  icon: React.ReactNode
  isSelected: boolean
  onClick: () => void
}

function LayoutTypeButton({ type: _type, label, icon, isSelected, onClick }: LayoutTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center justify-center p-2 rounded border transition-colors ${
        isSelected
          ? 'bg-vsc-accent/20 border-vsc-accent text-vsc-accent'
          : 'bg-vsc-input border-vsc-border text-vsc-fg-dim hover:border-vsc-fg-muted hover:text-vsc-fg'
      }`}
    >
      {icon}
      <span className="text-[10px] mt-1">{label}</span>
    </button>
  )
}

// ============================================================================
// Layout Visual Icons (SVG representations)
// ============================================================================

function SingleLayoutIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="22" height="16" rx="1" />
    </svg>
  )
}

function HorizontalSplitIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="10" height="16" rx="1" />
      <rect x="13" y="1" width="10" height="16" rx="1" />
    </svg>
  )
}

function VerticalSplitIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="22" height="7" rx="1" />
      <rect x="1" y="10" width="22" height="7" rx="1" />
    </svg>
  )
}

function QuadLayoutIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="10" height="7" rx="1" />
      <rect x="13" y="1" width="10" height="7" rx="1" />
      <rect x="1" y="10" width="10" height="7" rx="1" />
      <rect x="13" y="10" width="10" height="7" rx="1" />
    </svg>
  )
}

function Grid3x3Icon() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      {/* Row 1 */}
      <rect x="1" y="1" width="6" height="4.5" rx="0.5" />
      <rect x="9" y="1" width="6" height="4.5" rx="0.5" />
      <rect x="17" y="1" width="6" height="4.5" rx="0.5" />
      {/* Row 2 */}
      <rect x="1" y="6.75" width="6" height="4.5" rx="0.5" />
      <rect x="9" y="6.75" width="6" height="4.5" rx="0.5" />
      <rect x="17" y="6.75" width="6" height="4.5" rx="0.5" />
      {/* Row 3 */}
      <rect x="1" y="12.5" width="6" height="4.5" rx="0.5" />
      <rect x="9" y="12.5" width="6" height="4.5" rx="0.5" />
      <rect x="17" y="12.5" width="6" height="4.5" rx="0.5" />
    </svg>
  )
}

function Grid4x4Icon() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      {/* 4x4 grid of cells */}
      {[0, 1, 2, 3].map(row => (
        [0, 1, 2, 3].map(col => (
          <rect 
            key={`${row}-${col}`}
            x={1 + col * 5.75} 
            y={1 + row * 4.25} 
            width="4.5" 
            height="3" 
            rx="0.3" 
          />
        ))
      ))}
    </svg>
  )
}

// ============================================================================
// Panel List Item Component
// ============================================================================

interface PanelListItemProps {
  panel: PanelConfig
  isActive: boolean
  onClick: () => void
}

function PanelListItem({ panel, isActive, onClick }: PanelListItemProps) {
  const runCount = panel.selectedRunIds.length + panel.selectedSegmentIds.length

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
        isActive
          ? 'bg-vsc-accent/15 border-l-2 border-vsc-accent'
          : 'hover:bg-vsc-highlight border-l-2 border-transparent'
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-vsc-accent' : 'bg-vsc-fg-muted'}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${isActive ? 'text-vsc-fg font-medium' : 'text-vsc-fg'}`}>
          {panel.name}
        </div>
        <div className="text-xs text-vsc-fg-muted">
          {runCount === 0 ? 'No data selected' : `${runCount} series`}
        </div>
      </div>
      {isActive && <Check size={14} className="text-vsc-accent flex-shrink-0" />}
    </button>
  )
}

// ============================================================================
// Text Input Field Component
// ============================================================================

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <div className="px-4 py-1.5">
      <label className="block text-xs text-vsc-fg-dim mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 bg-vsc-input border border-vsc-border rounded text-sm text-vsc-fg focus:border-vsc-accent focus:outline-none"
      />
    </div>
  )
}

// ============================================================================
// Run Selection Checkbox Component
// ============================================================================

interface RunCheckboxProps {
  runId: string
  name: string
  color: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function RunCheckbox({ runId: _runId, name, color, checked, onChange }: RunCheckboxProps) {
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
      <div
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-vsc-fg truncate">{name}</span>
    </div>
  )
}

// ============================================================================
// Preset List Item Component
// ============================================================================

interface PresetItemProps {
  preset: ViewPreset
  onLoad: () => void
  onDelete: () => void
}

function PresetItem({ preset, onLoad, onDelete }: PresetItemProps) {
  const typeLabel = preset.type === 'layout' ? 'Layout' : 'Panel'
  const date = new Date(preset.createdAt).toLocaleDateString()

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 hover:bg-vsc-highlight group">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-vsc-fg truncate">{preset.name}</div>
        <div className="text-xs text-vsc-fg-muted">
          {typeLabel} • {date}
        </div>
      </div>
      <button
        onClick={onLoad}
        title="Load preset"
        className="p-1 rounded hover:bg-vsc-border-light text-vsc-fg-dim hover:text-vsc-fg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Download size={14} />
      </button>
      <button
        onClick={onDelete}
        title="Delete preset"
        className="p-1 rounded hover:bg-vsc-border-light text-vsc-fg-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ============================================================================
// Save Preset Dialog Component
// ============================================================================

interface SavePresetDialogProps {
  type: 'layout' | 'panel'
  onSave: (name: string) => void
  onCancel: () => void
}

function SavePresetDialog({ type, onSave, onCancel }: SavePresetDialogProps) {
  const [name, setName] = useState('')

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
    }
  }

  return (
    <div className="px-4 py-2 bg-vsc-bg-light border border-vsc-border rounded mx-4 mb-2">
      <div className="text-xs text-vsc-fg-dim mb-2">
        Save {type === 'layout' ? 'Layout' : 'Panel'} Preset
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Preset name..."
        autoFocus
        className="w-full px-2 py-1.5 bg-vsc-input border border-vsc-border rounded text-sm text-vsc-fg focus:border-vsc-accent focus:outline-none mb-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1 px-2 py-1 bg-vsc-accent text-white rounded text-xs hover:bg-vsc-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-2 py-1 bg-vsc-input border border-vsc-border rounded text-xs text-vsc-fg hover:bg-vsc-border-light"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Grid Editor Component
// ============================================================================

interface GridEditorProps {
  gridDimensions: { rows: number; cols: number }
  panels: Record<string, PanelConfig>
  activePanelId: string | null
  selectedCells: Set<string>  // Set of "row-col" keys
  onCellClick: (row: number, col: number, shiftKey: boolean) => void
  onMerge: () => void
  onSplit: () => void
}

// Panel colors for visual distinction
const PANEL_COLORS = [
  'bg-blue-500/30 border-blue-500/50',
  'bg-green-500/30 border-green-500/50',
  'bg-purple-500/30 border-purple-500/50',
  'bg-orange-500/30 border-orange-500/50',
  'bg-pink-500/30 border-pink-500/50',
  'bg-cyan-500/30 border-cyan-500/50',
  'bg-yellow-500/30 border-yellow-500/50',
  'bg-red-500/30 border-red-500/50',
  'bg-indigo-500/30 border-indigo-500/50',
  'bg-teal-500/30 border-teal-500/50',
  'bg-lime-500/30 border-lime-500/50',
  'bg-amber-500/30 border-amber-500/50',
  'bg-violet-500/30 border-violet-500/50',
  'bg-fuchsia-500/30 border-fuchsia-500/50',
  'bg-rose-500/30 border-rose-500/50',
  'bg-sky-500/30 border-sky-500/50',
]

function GridEditor({ 
  gridDimensions, 
  panels, 
  activePanelId,
  selectedCells, 
  onCellClick, 
  onMerge, 
  onSplit 
}: GridEditorProps) {
  // Build a map of cell -> panel for quick lookup
  const cellToPanelMap = new Map<string, { panelId: string; colorIndex: number }>()
  const panelIds = Object.keys(panels).sort()
  
  panelIds.forEach((panelId, index) => {
    const panel = panels[panelId]
    if (panel.gridArea) {
      for (let row = panel.gridArea.rowStart; row < panel.gridArea.rowEnd; row++) {
        for (let col = panel.gridArea.colStart; col < panel.gridArea.colEnd; col++) {
          cellToPanelMap.set(`${row}-${col}`, { panelId, colorIndex: index % PANEL_COLORS.length })
        }
      }
    }
  })
  
  // Check if active panel can be split (spans multiple cells)
  const canSplit = activePanelId && panels[activePanelId]?.gridArea && (
    (panels[activePanelId].gridArea!.rowEnd - panels[activePanelId].gridArea!.rowStart > 1) ||
    (panels[activePanelId].gridArea!.colEnd - panels[activePanelId].gridArea!.colStart > 1)
  )
  
  // Check if selected cells can be merged
  const selectedGridAreas: GridArea[] = []
  const selectedPanelIds = new Set<string>()
  selectedCells.forEach(cellKey => {
    const panelInfo = cellToPanelMap.get(cellKey)
    if (panelInfo) {
      selectedPanelIds.add(panelInfo.panelId)
    }
  })
  
  // Get grid areas for selected panels
  selectedPanelIds.forEach(panelId => {
    const panel = panels[panelId]
    if (panel.gridArea) {
      selectedGridAreas.push(panel.gridArea)
    }
  })
  
  const canMerge = selectedPanelIds.size >= 2 && canMergeGridAreas(selectedGridAreas)
  
  return (
    <div className="px-4 py-2">
      {/* Grid visualization */}
      <div 
        className="grid gap-1 mb-3 p-2 bg-vsc-bg-light rounded border border-vsc-border"
        style={{
          gridTemplateRows: `repeat(${gridDimensions.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
          aspectRatio: `${gridDimensions.cols} / ${gridDimensions.rows}`,
          maxHeight: '200px',
        }}
      >
        {Array.from({ length: gridDimensions.rows }, (_, row) =>
          Array.from({ length: gridDimensions.cols }, (_, col) => {
            const cellKey = `${row + 1}-${col + 1}`
            const panelInfo = cellToPanelMap.get(cellKey)
            const isSelected = selectedCells.has(cellKey)
            const isActivePanel = panelInfo?.panelId === activePanelId
            const colorClass = panelInfo ? PANEL_COLORS[panelInfo.colorIndex] : 'bg-vsc-input border-vsc-border'
            
            return (
              <button
                key={cellKey}
                onClick={(e) => onCellClick(row + 1, col + 1, e.shiftKey)}
                className={`
                  min-h-[24px] rounded border-2 transition-all
                  ${colorClass}
                  ${isSelected ? 'ring-2 ring-vsc-accent ring-offset-1 ring-offset-vsc-bg-light' : ''}
                  ${isActivePanel ? 'border-vsc-accent' : ''}
                  hover:opacity-80
                `}
                title={panelInfo ? panels[panelInfo.panelId]?.name : 'Empty cell'}
              />
            )
          })
        )}
      </div>
      
      {/* Instructions */}
      <p className="text-xs text-vsc-fg-muted mb-3">
        Click cells to select. Shift+click to select multiple. Select adjacent panels to merge them.
      </p>
      
      {/* Merge/Split buttons */}
      <div className="flex gap-2">
        <button
          onClick={onMerge}
          disabled={!canMerge}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border rounded text-sm text-vsc-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={canMerge ? 'Merge selected panels' : 'Select adjacent panels to merge'}
        >
          <Merge size={14} />
          Merge
        </button>
        <button
          onClick={onSplit}
          disabled={!canSplit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border rounded text-sm text-vsc-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={canSplit ? 'Split active panel into cells' : 'Select a merged panel to split'}
        >
          <Split size={14} />
          Split
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function LayoutConfigView() {
  const {
    setLayoutType,
    setActivePanelId,
    updatePanelConfig,
    togglePanelRunSelection,
    mergePanels,
    splitPanel,
    saveViewPreset,
    loadViewPreset,
    deleteViewPreset,
    getRunColor,
  } = useAppStore()
  
  // Get active tab data
  const activeTab = useActiveTab()
  const layoutType = activeTab?.layoutType || 'single'
  const gridDimensions = activeTab?.gridDimensions || { rows: 1, cols: 1 }
  const panels = activeTab?.panels || {}
  const activePanelId = activeTab?.activePanelId || null
  const testSessions = activeTab?.testSessions || []
  const viewPresets = activeTab?.viewPresets || []

  const [saveDialogType, setSaveDialogType] = useState<'layout' | 'panel' | null>(null)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  
  // Show grid editor for larger grids
  const showGridEditor = layoutType === 'grid-3x3' || layoutType === 'grid-4x4' || layoutType === 'custom'
  
  // Build cell -> panelId map for the grid editor
  const cellToPanelMap = new Map<string, string>()
  Object.entries(panels).forEach(([panelId, panel]) => {
    if (panel.gridArea) {
      for (let row = panel.gridArea.rowStart; row < panel.gridArea.rowEnd; row++) {
        for (let col = panel.gridArea.colStart; col < panel.gridArea.colEnd; col++) {
          cellToPanelMap.set(`${row}-${col}`, panelId)
        }
      }
    }
  })
  
  // Handle cell click in grid editor
  const handleCellClick = useCallback((row: number, col: number, shiftKey: boolean) => {
    const cellKey = `${row}-${col}`
    const panelId = cellToPanelMap.get(cellKey)
    
    // First, select the panel
    if (panelId) {
      setActivePanelId(panelId)
    }
    
    // Update selected cells
    setSelectedCells(prev => {
      const next = new Set(prev)
      
      if (shiftKey) {
        // Add to selection (toggle)
        if (next.has(cellKey)) {
          next.delete(cellKey)
        } else {
          next.add(cellKey)
        }
      } else {
        // Replace selection
        next.clear()
        next.add(cellKey)
      }
      
      return next
    })
  }, [cellToPanelMap, setActivePanelId])
  
  // Handle merge
  const handleMerge = useCallback(() => {
    // Get unique panel IDs from selected cells
    const panelIdsToMerge = new Set<string>()
    selectedCells.forEach(cellKey => {
      const panelId = cellToPanelMap.get(cellKey)
      if (panelId) {
        panelIdsToMerge.add(panelId)
      }
    })
    
    if (panelIdsToMerge.size >= 2) {
      mergePanels(Array.from(panelIdsToMerge))
      setSelectedCells(new Set())
    }
  }, [selectedCells, cellToPanelMap, mergePanels])
  
  // Handle split
  const handleSplit = useCallback(() => {
    if (activePanelId) {
      splitPanel(activePanelId)
      setSelectedCells(new Set())
    }
  }, [activePanelId, splitPanel])

  // Get all runs for data selection
  const allRuns = testSessions.flatMap((session) => session.runs)

  // Get active panel
  const activePanel = activePanelId ? panels[activePanelId] : null

  // Check if a run is selected in the active panel
  const isRunSelectedInPanel = (runId: string): boolean => {
    if (!activePanel) return false
    return (
      activePanel.selectedRunIds.includes(runId) ||
      activePanel.selectedSegmentIds.some((id) => id.startsWith(`${runId}:segment-`))
    )
  }

  // Handle run toggle in active panel
  const handleRunToggle = async (runId: string) => {
    if (!activePanelId) return
    await togglePanelRunSelection(activePanelId, runId)
  }

  // Handle panel name change
  const handlePanelNameChange = (name: string) => {
    if (!activePanelId) return
    updatePanelConfig(activePanelId, { name })
  }

  // Handle save preset
  const handleSavePreset = (name: string) => {
    if (saveDialogType) {
      saveViewPreset(name, saveDialogType)
      setSaveDialogType(null)
    }
  }

  // Layout options
  const layoutOptions: { type: LayoutType; label: string; icon: React.ReactNode }[] = [
    { type: 'single', label: 'Single', icon: <SingleLayoutIcon /> },
    { type: 'horizontal-2', label: '2 Horiz', icon: <HorizontalSplitIcon /> },
    { type: 'vertical-2', label: '2 Vert', icon: <VerticalSplitIcon /> },
    { type: 'quad', label: '2x2', icon: <QuadLayoutIcon /> },
    { type: 'grid-3x3', label: '3x3', icon: <Grid3x3Icon /> },
    { type: 'grid-4x4', label: '4x4', icon: <Grid4x4Icon /> },
  ]

  // Sort panels for display
  const sortedPanels = Object.values(panels).sort((a, b) => a.id.localeCompare(b.id))

  // Filter presets by type
  const layoutPresets = viewPresets.filter((p) => p.type === 'layout')
  const panelPresets = viewPresets.filter((p) => p.type === 'panel')

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {/* Layout Type Selector */}
        <CollapsibleSection title="Layout" icon={<LayoutGrid size={14} />} defaultOpen>
          <div className="grid grid-cols-3 gap-2 px-4">
            {layoutOptions.map((option) => (
              <LayoutTypeButton
                key={option.type}
                type={option.type}
                label={option.label}
                icon={option.icon}
                isSelected={layoutType === option.type || (layoutType === 'custom' && option.type === 'grid-4x4')}
                onClick={() => setLayoutType(option.type)}
              />
            ))}
          </div>
        </CollapsibleSection>

        {/* Grid Editor - only show for larger grids */}
        {showGridEditor && (
          <CollapsibleSection title="Grid Editor" icon={<Grid3X3 size={14} />} defaultOpen>
            <GridEditor
              gridDimensions={gridDimensions}
              panels={panels}
              activePanelId={activePanelId}
              selectedCells={selectedCells}
              onCellClick={handleCellClick}
              onMerge={handleMerge}
              onSplit={handleSplit}
            />
          </CollapsibleSection>
        )}

        {/* Panel List */}
        <CollapsibleSection title="Panels" icon={<Layers size={14} />} defaultOpen>
          {sortedPanels.length === 0 ? (
            <p className="px-4 text-xs text-vsc-fg-muted">No panels configured</p>
          ) : (
            sortedPanels.map((panel) => (
              <PanelListItem
                key={panel.id}
                panel={panel}
                isActive={activePanelId === panel.id}
                onClick={() => setActivePanelId(panel.id)}
              />
            ))
          )}
        </CollapsibleSection>

        {/* Active Panel Settings */}
        {activePanel && (
          <CollapsibleSection title="Panel Settings" icon={<Settings size={14} />} defaultOpen>
            <TextField
              label="Panel Name"
              value={activePanel.name}
              onChange={handlePanelNameChange}
              placeholder="Enter panel name..."
            />

            <div className="px-4 py-1.5">
              <label className="block text-xs text-vsc-fg-dim mb-2">Data Selection</label>
              {allRuns.length === 0 ? (
                <p className="text-xs text-vsc-fg-muted">No data loaded. Open a data folder first.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-vsc-border rounded">
                  {allRuns.map((run) => (
                    <RunCheckbox
                      key={run.id}
                      runId={run.id}
                      name={run.name}
                      color={getRunColor(run.id)}
                      checked={isRunSelectedInPanel(run.id)}
                      onChange={() => handleRunToggle(run.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 pt-2">
              <p className="text-xs text-vsc-fg-muted">
                Use the <strong>Graph Settings</strong> view to configure chart appearance for this panel.
              </p>
            </div>
          </CollapsibleSection>
        )}

        {/* Presets Section */}
        <CollapsibleSection title="Presets" icon={<Save size={14} />}>
          {/* Save Buttons */}
          <div className="px-4 space-y-2 mb-3">
            <button
              onClick={() => setSaveDialogType('layout')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border rounded text-sm text-vsc-fg transition-colors"
            >
              <Save size={14} />
              Save Layout Preset
            </button>

            <button
              onClick={() => setSaveDialogType('panel')}
              disabled={!activePanel}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border rounded text-sm text-vsc-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              Save Panel Preset
            </button>
          </div>

          {/* Save Dialog */}
          {saveDialogType && (
            <SavePresetDialog
              type={saveDialogType}
              onSave={handleSavePreset}
              onCancel={() => setSaveDialogType(null)}
            />
          )}

          {/* Layout Presets */}
          {layoutPresets.length > 0 && (
            <div className="mb-2">
              <div className="px-4 py-1 text-xs text-vsc-fg-muted font-medium uppercase tracking-wide">
                Layout Presets
              </div>
              {layoutPresets.map((preset) => (
                <PresetItem
                  key={preset.id}
                  preset={preset}
                  onLoad={() => loadViewPreset(preset.id)}
                  onDelete={() => deleteViewPreset(preset.id)}
                />
              ))}
            </div>
          )}

          {/* Panel Presets */}
          {panelPresets.length > 0 && (
            <div>
              <div className="px-4 py-1 text-xs text-vsc-fg-muted font-medium uppercase tracking-wide">
                Panel Presets
              </div>
              {panelPresets.map((preset) => (
                <PresetItem
                  key={preset.id}
                  preset={preset}
                  onLoad={() => loadViewPreset(preset.id)}
                  onDelete={() => deleteViewPreset(preset.id)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {viewPresets.length === 0 && !saveDialogType && (
            <p className="px-4 text-xs text-vsc-fg-muted">
              No presets saved yet. Save a layout or panel preset to quickly restore configurations.
            </p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  )
}
