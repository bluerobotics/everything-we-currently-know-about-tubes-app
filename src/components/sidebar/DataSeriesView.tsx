import { useState, useRef, useCallback, useEffect } from 'react'
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileText,
  Check,
  Layers,
  Scissors,
  Trash2,
  Edit2,
  X,
  Circle,
  Minus,
} from 'lucide-react'
import {
  useAppStore,
  useActiveTab,
  useActivePanelConfig,
  useTestBrowserSessions,
  type SliceCollection,
  type Slice,
  type SeriesConfig,
  type DashPattern,
  type Interpolation,
  COLUMN_UNITS,
} from '../../stores/appStore'

// ============================================================================
// Color Swatch Component
// ============================================================================

interface ColorSwatchProps {
  color: string
  onChange: (color: string) => void
  size?: 'sm' | 'md'
}

function ColorSwatch({ color, onChange, size = 'sm' }: ColorSwatchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          inputRef.current?.click()
        }}
        className={`${sizeClass} rounded border border-vsc-border hover:border-vsc-fg-dim transition-colors cursor-pointer flex-shrink-0`}
        style={{ backgroundColor: color }}
        title="Click to change color"
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onInput={handleColorChange}
        onChange={handleColorChange}
        onBlur={(e) => onChange(e.target.value)}
        className="absolute opacity-0 w-0 h-0 pointer-events-auto"
      />
    </div>
  )
}

// ============================================================================
// Inline Series Settings Component
// ============================================================================

interface InlineSeriesSettingsProps {
  config: SeriesConfig
  onUpdate: (updates: Partial<SeriesConfig>) => void
}

const INTERPOLATION_OPTIONS: { value: Interpolation; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'spline', label: 'Spline' },
  { value: 'stepBefore', label: 'Step' },
  { value: 'stepAfter', label: 'Step After' },
]

const DASH_OPTIONS: { value: DashPattern; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'dashDot', label: 'Dash-Dot' },
]

function InlineSeriesSettings({ config, onUpdate }: InlineSeriesSettingsProps) {
  return (
    <div className="px-4 py-2 bg-vsc-bg space-y-2">
      {/* Row 1: Points and Line Width */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.showPoints}
            onChange={(e) => onUpdate({ showPoints: e.target.checked })}
            className="w-3 h-3 accent-vsc-accent"
          />
          <span className="text-xs text-vsc-fg-dim">Points</span>
        </label>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-vsc-fg-muted">Width:</span>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={config.lineWidth}
            onChange={(e) => onUpdate({ lineWidth: parseFloat(e.target.value) })}
            className="w-16 h-3 accent-vsc-accent"
          />
          <span className="text-xs text-vsc-fg-muted w-4">{config.lineWidth}</span>
        </div>
      </div>
      
      {/* Row 2: Interpolation and Line Style */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-vsc-fg-muted">Line:</span>
          <select
            value={config.interpolation}
            onChange={(e) => onUpdate({ interpolation: e.target.value as Interpolation })}
            className="px-1 py-0.5 text-xs bg-vsc-input border border-vsc-border rounded text-vsc-fg"
          >
            {INTERPOLATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs text-vsc-fg-muted">Style:</span>
          <select
            value={config.dashPattern}
            onChange={(e) => onUpdate({ dashPattern: e.target.value as DashPattern })}
            className="px-1 py-0.5 text-xs bg-vsc-input border border-vsc-border rounded text-vsc-fg"
          >
            {DASH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Collapsible Section Component
// ============================================================================

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: string | number
}

function CollapsibleSection({ title, icon, defaultOpen = true, children, badge }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-vsc-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-vsc-highlight transition-colors"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-vsc-fg-dim">{icon}</span>
        <span className="text-sm font-medium text-vsc-fg flex-1 text-left">{title}</span>
        {badge !== undefined && (
          <span className="text-xs text-vsc-fg-muted bg-vsc-input px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </button>
      {isOpen && <div className="pb-2">{children}</div>}
    </div>
  )
}

// ============================================================================
// Test Run Item Component
// ============================================================================

interface TestRunItemProps {
  run: {
    id: string
    name: string
    filePath: string
    selected: boolean
    color: string
    segments?: number
    segmentInfo?: Array<{
      id: string
      index: number
      rowCount: number
      selected: boolean
      color: string
    }>
  }
  isExpanded: boolean
  settingsExpanded: boolean
  onToggleSelection: () => void
  onToggleExpand: () => void
  onToggleSettings: () => void
  onColorChange: (color: string) => void
  onSegmentToggle?: (segmentId: string) => void
  onSegmentColorChange?: (segmentId: string, color: string) => void
  seriesConfig: SeriesConfig
  onSeriesConfigUpdate: (updates: Partial<SeriesConfig>) => void
  onOpenFileLocation: (filePath: string) => void
}

function TestRunItem({
  run,
  isExpanded,
  settingsExpanded,
  onToggleSelection,
  onToggleExpand,
  onToggleSettings,
  onColorChange,
  onSegmentToggle,
  onSegmentColorChange,
  seriesConfig,
  onSeriesConfigUpdate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onOpenFileLocation: _onOpenFileLocation,
}: TestRunItemProps) {
  const hasSegments = (run.segments ?? 0) > 1
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  
  // Determine selection status
  const getSelectionStatus = () => {
    if (run.selected) return 'full'
    if (run.segmentInfo?.some(s => s.selected)) return 'partial'
    return 'none'
  }
  
  const selectionStatus = getSelectionStatus()
  
  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])
  
  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])
  
  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu, closeContextMenu])
  
  return (
    <div className="border-b border-vsc-border/30 last:border-b-0">
      {/* Run Row */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-highlight group"
        onContextMenu={handleContextMenu}
      >
        {/* Expand arrow for multi-segment files */}
        {hasSegments ? (
          <button
            className="p-0.5 hover:bg-vsc-input rounded"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
          >
            {isExpanded ? (
              <ChevronDown size={12} className="text-vsc-fg-dim" />
            ) : (
              <ChevronRight size={12} className="text-vsc-fg-dim" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Checkbox */}
        <div
          onClick={onToggleSelection}
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
            selectionStatus === 'full'
              ? 'bg-vsc-accent border-vsc-accent'
              : selectionStatus === 'partial'
              ? 'bg-vsc-accent/50 border-vsc-accent'
              : 'border-vsc-fg-muted hover:border-vsc-fg-dim'
          }`}
        >
          {selectionStatus === 'full' && <Check size={12} className="text-white" />}
          {selectionStatus === 'partial' && <Minus size={10} className="text-white" />}
        </div>

        {/* Color Swatch */}
        <ColorSwatch
          color={selectionStatus !== 'none' ? seriesConfig.color : '#6e6e6e'}
          onChange={onColorChange}
        />

        {/* File Icon and Name */}
        <FileText size={14} className="flex-shrink-0 text-vsc-fg-dim" />
        <span
          className={`text-sm truncate flex-1 ${
            selectionStatus !== 'none' ? 'text-vsc-fg' : 'text-vsc-fg-dim'
          }`}
          title={run.name}
        >
          {run.name}
        </span>

        {/* Segment count badge */}
        {hasSegments && (
          <span className="flex items-center gap-1 text-xs text-vsc-fg-muted" title={`${run.segments} segments`}>
            <Layers size={10} />
            {run.segments}
          </span>
        )}

        {/* Settings expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSettings()
          }}
          className={`p-1 rounded transition-colors ${
            settingsExpanded
              ? 'bg-vsc-accent text-white'
              : 'opacity-0 group-hover:opacity-100 hover:bg-vsc-input text-vsc-fg-dim hover:text-vsc-fg'
          }`}
          title="Series settings"
        >
          <Circle size={10} />
        </button>
      </div>

      {/* Settings Panel */}
      {settingsExpanded && (
        <div className="ml-7 border-l border-vsc-border">
          <InlineSeriesSettings config={seriesConfig} onUpdate={onSeriesConfigUpdate} />
        </div>
      )}

      {/* Expanded Segment List */}
      {hasSegments && isExpanded && run.segmentInfo && (
        <div className="bg-vsc-bg pl-6">
          {run.segmentInfo.map((segment) => (
            <div
              key={segment.id}
              className="flex items-center gap-2 px-3 py-1 hover:bg-vsc-highlight cursor-pointer"
              onClick={() => onSegmentToggle?.(segment.id)}
            >
              <span className="w-5" />
              
              {/* Checkbox */}
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                  segment.selected
                    ? 'bg-vsc-accent border-vsc-accent'
                    : 'border-vsc-fg-muted hover:border-vsc-fg-dim'
                }`}
              >
                {segment.selected && <Check size={10} className="text-white" />}
              </div>

              {/* Color Swatch */}
              <ColorSwatch
                color={segment.selected ? segment.color : '#6e6e6e'}
                onChange={(color) => onSegmentColorChange?.(segment.id, color)}
                size="sm"
              />

              {/* Segment name */}
              <Layers size={12} className="text-vsc-fg-dim" />
              <span className={`text-xs flex-1 ${segment.selected ? 'text-vsc-fg' : 'text-vsc-fg-dim'}`}>
                Segment {segment.index + 1}
              </span>

              {/* Row count */}
              <span className="text-xs text-vsc-fg-muted">
                {segment.rowCount.toLocaleString()} rows
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Session Section Component
// ============================================================================

interface SessionSectionProps {
  session: {
    id: string
    name: string
    runs: Array<{
      id: string
      name: string
      filePath: string
      selected: boolean
      color: string
      segments?: number
      segmentInfo?: Array<{
        id: string
        index: number
        rowCount: number
        selected: boolean
        color: string
      }>
    }>
  }
  isExpanded: boolean
  onToggleExpand: () => void
  expandedRunIds: string[]
  settingsExpandedRunIds: string[]
  onToggleRunExpanded: (runId: string) => void
  onToggleRunSettings: (runId: string) => void
  onToggleRun: (runId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onRunColorChange: (runId: string, color: string) => void
  onSegmentToggle: (segmentId: string) => void
  onSegmentColorChange: (segmentId: string, color: string) => void
  getSeriesConfig: (runId: string) => SeriesConfig
  onSeriesConfigUpdate: (runId: string, updates: Partial<SeriesConfig>) => void
  onOpenFileLocation: (filePath: string) => void
}

function SessionSection({
  session,
  isExpanded,
  onToggleExpand,
  expandedRunIds,
  settingsExpandedRunIds,
  onToggleRunExpanded,
  onToggleRunSettings,
  onToggleRun,
  onSelectAll,
  onDeselectAll,
  onRunColorChange,
  onSegmentToggle,
  onSegmentColorChange,
  getSeriesConfig,
  onSeriesConfigUpdate,
  onOpenFileLocation,
}: SessionSectionProps) {
  const selectedCount = session.runs.filter((r) => 
    r.selected || r.segmentInfo?.some(s => s.selected)
  ).length

  return (
    <div className="border-b border-vsc-border/50 last:border-b-0">
      {/* Session Header */}
      <div
        className="flex items-center gap-1 px-2 py-2 hover:bg-vsc-highlight cursor-pointer group"
        onClick={onToggleExpand}
      >
        <button className="p-0.5 hover:bg-vsc-input rounded">
          {isExpanded ? (
            <ChevronDown size={14} className="text-vsc-fg-dim" />
          ) : (
            <ChevronRight size={14} className="text-vsc-fg-dim" />
          )}
        </button>
        <FolderOpen size={14} className="text-vsc-warning flex-shrink-0" />
        <span className="text-sm text-vsc-fg truncate flex-1" title={session.name}>
          {session.name}
        </span>
        <span className="text-xs text-vsc-fg-muted">
          {selectedCount}/{session.runs.length}
        </span>
      </div>

      {/* Session Content */}
      {isExpanded && (
        <div className="bg-vsc-bg-dark">
          {/* Selection Actions */}
          <div className="flex gap-2 px-4 py-1.5 border-b border-vsc-border">
            <button
              className="text-xs px-2 py-0.5 rounded text-vsc-accent hover:bg-vsc-input"
              onClick={(e) => {
                e.stopPropagation()
                onSelectAll()
              }}
            >
              Select All
            </button>
            <button
              className="text-xs px-2 py-0.5 rounded text-vsc-accent hover:bg-vsc-input"
              onClick={(e) => {
                e.stopPropagation()
                onDeselectAll()
              }}
            >
              Deselect All
            </button>
          </div>

          {/* Run List */}
          <div className="py-1">
            {session.runs.map((run) => (
              <TestRunItem
                key={run.id}
                run={run}
                isExpanded={expandedRunIds.includes(run.id)}
                settingsExpanded={settingsExpandedRunIds.includes(run.id)}
                onToggleSelection={() => onToggleRun(run.id)}
                onToggleExpand={() => onToggleRunExpanded(run.id)}
                onToggleSettings={() => onToggleRunSettings(run.id)}
                onColorChange={(color) => onRunColorChange(run.id, color)}
                onSegmentToggle={onSegmentToggle}
                onSegmentColorChange={onSegmentColorChange}
                seriesConfig={getSeriesConfig(run.id)}
                onSeriesConfigUpdate={(updates) => onSeriesConfigUpdate(run.id, updates)}
                onOpenFileLocation={onOpenFileLocation}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Slice Item Component (for individual slice selection)
// ============================================================================

interface SliceItemProps {
  slice: Slice
  collectionId?: string  // undefined for standalone slices
  isSelected: boolean
  onToggleSelection: () => void
  onColorChange: (color: string) => void
  onRename: (name: string) => void
  onDelete: () => void
}

function SliceItem({
  slice,
  isSelected,
  onToggleSelection,
  onColorChange,
  onRename,
  onDelete,
}: SliceItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(slice.name)
  
  const sliceColor = slice.color || '#3b82f6'  // Default blue

  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== slice.name) {
      onRename(editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 hover:bg-vsc-highlight group">
      {/* Selection Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelection()
        }}
        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
          isSelected
            ? 'bg-vsc-accent border-vsc-accent'
            : 'border-vsc-fg-muted hover:border-vsc-fg-dim'
        }`}
      >
        {isSelected && <Check size={10} className="text-white" />}
      </div>

      {/* Color Swatch */}
      <ColorSwatch color={sliceColor} onChange={onColorChange} size="sm" />

      {/* Slice Name */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          autoFocus
          onBlur={handleSaveRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveRename()
            if (e.key === 'Escape') {
              setEditName(slice.name)
              setIsEditing(false)
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-1 py-0.5 bg-vsc-input border border-vsc-accent rounded text-xs text-vsc-fg focus:outline-none"
        />
      ) : (
        <span
          className="text-xs text-vsc-fg truncate flex-1 cursor-pointer"
          onDoubleClick={() => {
            setEditName(slice.name)
            setIsEditing(true)
          }}
          title={slice.name}
        >
          {slice.name}
        </span>
      )}

      {/* X value badge */}
      <span className="text-[10px] text-vsc-fg-muted bg-vsc-input px-1 py-0.5 rounded">
        {slice.xValue.toFixed(2)}{COLUMN_UNITS[slice.xColumn] || ''}
      </span>

      {/* Point count */}
      <span className="text-[10px] text-vsc-fg-muted">
        {slice.points.length} pts
      </span>

      {/* Edit button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setEditName(slice.name)
          setIsEditing(true)
        }}
        className="p-0.5 rounded hover:bg-vsc-input text-vsc-fg-dim hover:text-vsc-fg opacity-0 group-hover:opacity-100 transition-opacity"
        title="Rename"
      >
        <Edit2 size={10} />
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="p-0.5 rounded hover:bg-vsc-input text-vsc-fg-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete slice"
      >
        <Trash2 size={10} />
      </button>
    </div>
  )
}

// ============================================================================
// Slice Collection Item Component
// ============================================================================

interface SliceCollectionItemProps {
  collection: SliceCollection
  isExpanded: boolean
  selectedSliceIds: string[]
  onToggleExpand: () => void
  onToggleSliceSelection: (sliceId: string) => void
  onSliceColorChange: (sliceId: string, color: string) => void
  onSliceRename: (sliceId: string, name: string) => void
  onDeleteSlice: (sliceId: string) => void
  onRenameCollection: (name: string) => void
  onDeleteCollection: () => void
}

function SliceCollectionItem({
  collection,
  isExpanded,
  selectedSliceIds,
  onToggleExpand,
  onToggleSliceSelection,
  onSliceColorChange,
  onSliceRename,
  onDeleteSlice,
  onRenameCollection,
  onDeleteCollection,
}: SliceCollectionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(collection.name)

  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== collection.name) {
      onRenameCollection(editName.trim())
    }
    setIsEditing(false)
  }

  // Count how many slices are selected
  const selectedCount = collection.slices.filter(s => selectedSliceIds.includes(s.id)).length
  const hasPartialSelection = selectedCount > 0 && selectedCount < collection.slices.length
  const allSelected = selectedCount === collection.slices.length && collection.slices.length > 0

  return (
    <div className="border-b border-vsc-border/30 last:border-b-0">
      {/* Collection Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-vsc-highlight group">
        {/* Expand Arrow */}
        <button
          onClick={onToggleExpand}
          className="p-0.5 hover:bg-vsc-input rounded"
        >
          {isExpanded ? (
            <ChevronDown size={12} className="text-vsc-fg-dim" />
          ) : (
            <ChevronRight size={12} className="text-vsc-fg-dim" />
          )}
        </button>

        {/* Selection indicator (shows partial/full selection status) */}
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            allSelected
              ? 'bg-vsc-accent border-vsc-accent'
              : hasPartialSelection
              ? 'bg-vsc-accent/50 border-vsc-accent'
              : 'border-vsc-fg-muted'
          }`}
        >
          {allSelected && <Check size={12} className="text-white" />}
          {hasPartialSelection && <Minus size={10} className="text-white" />}
        </div>

        {/* Collection Icon */}
        <Scissors size={14} className="text-vsc-fg-dim flex-shrink-0" />

        {/* Collection Name */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              onBlur={handleSaveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename()
                if (e.key === 'Escape') {
                  setEditName(collection.name)
                  setIsEditing(false)
                }
              }}
              className="flex-1 px-1 py-0.5 bg-vsc-input border border-vsc-accent rounded text-sm text-vsc-fg focus:outline-none"
            />
            <button
              onClick={() => {
                setEditName(collection.name)
                setIsEditing(false)
              }}
              className="p-0.5 hover:bg-vsc-input rounded text-vsc-fg-dim"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span
            className="text-sm text-vsc-fg truncate flex-1 cursor-pointer"
            onDoubleClick={() => {
              setEditName(collection.name)
              setIsEditing(true)
            }}
            title={collection.name}
          >
            {collection.name}
          </span>
        )}

        {/* Selection/Slice Count */}
        <span className="text-xs text-vsc-fg-muted">
          {selectedCount > 0 ? `${selectedCount}/` : ''}{collection.slices.length} slice{collection.slices.length !== 1 ? 's' : ''}
        </span>

        {/* Action Buttons */}
        <button
          onClick={() => {
            setEditName(collection.name)
            setIsEditing(true)
          }}
          className="p-1 rounded hover:bg-vsc-input text-vsc-fg-dim hover:text-vsc-fg opacity-0 group-hover:opacity-100 transition-opacity"
          title="Rename collection"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={onDeleteCollection}
          className="p-1 rounded hover:bg-vsc-input text-vsc-fg-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete collection"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Expanded Slice List */}
      {isExpanded && collection.slices.length > 0 && (
        <div className="bg-vsc-bg pl-6">
          {collection.slices.map((slice) => (
            <SliceItem
              key={slice.id}
              slice={slice}
              collectionId={collection.id}
              isSelected={selectedSliceIds.includes(slice.id)}
              onToggleSelection={() => onToggleSliceSelection(slice.id)}
              onColorChange={(color) => onSliceColorChange(slice.id, color)}
              onRename={(name) => onSliceRename(slice.id, name)}
              onDelete={() => onDeleteSlice(slice.id)}
            />
          ))}
        </div>
      )}

      {isExpanded && collection.slices.length === 0 && (
        <div className="bg-vsc-bg pl-10 pr-4 py-2">
          <p className="text-xs text-vsc-fg-muted italic">
            No slices yet. Right-click on a chart to create one.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main DataSeriesView Component
// ============================================================================

export function DataSeriesView() {
  const {
    toggleRunSelection,
    selectAllRuns,
    deselectAllRuns,
    toggleRunExpanded,
    toggleSegmentSelection,
    getSeriesConfig,
    updatePanelChartConfig,
    togglePanelSliceSelection,
    deleteSlice,
    deleteSliceCollection,
    renameSliceCollection,
    renameSlice,
    updateSliceColor,
  } = useAppStore()

  // Get active tab state
  const activeTab = useActiveTab()
  const activePanel = useActivePanelConfig()
  const activePanelId = activeTab?.activePanelId
  const sessions = useTestBrowserSessions()
  
  // Local UI state
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(sessions.map((s) => s.id))
  )
  const [expandedRunIds, setExpandedRunIds] = useState<string[]>(
    activeTab?.expandedRunIds || []
  )
  const [settingsExpandedRunIds, setSettingsExpandedRunIds] = useState<Set<string>>(new Set())
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<Set<string>>(new Set())

  // Slice data
  const sliceCollections = activeTab?.sliceCollections ?? []
  const standaloneSlices = activeTab?.slices ?? []
  const selectedSliceIds = activePanel?.selectedSliceIds ?? []

  // Toggle session expand
  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  // Toggle run settings expand
  const toggleRunSettings = (runId: string) => {
    setSettingsExpandedRunIds((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  // Toggle collection expand
  const toggleCollectionExpanded = (collectionId: string) => {
    setExpandedCollectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(collectionId)) {
        next.delete(collectionId)
      } else {
        next.add(collectionId)
      }
      return next
    })
  }

  // Handle run color change
  const handleRunColorChange = (runId: string, color: string) => {
    if (!activePanelId) return
    const chartConfig = activePanel?.chartConfig
    if (!chartConfig) return
    
    updatePanelChartConfig(activePanelId, {
      seriesConfigs: {
        ...chartConfig.seriesConfigs,
        [runId]: {
          ...getSeriesConfig(runId),
          color,
        },
      },
    })
  }

  // Handle segment color change
  const handleSegmentColorChange = (segmentId: string, color: string) => {
    if (!activePanelId) return
    const chartConfig = activePanel?.chartConfig
    if (!chartConfig) return
    
    updatePanelChartConfig(activePanelId, {
      seriesConfigs: {
        ...chartConfig.seriesConfigs,
        [segmentId]: {
          ...getSeriesConfig(segmentId),
          color,
        },
      },
    })
  }

  // Handle series config update
  const handleSeriesConfigUpdate = (runId: string, updates: Partial<SeriesConfig>) => {
    if (!activePanelId) return
    const chartConfig = activePanel?.chartConfig
    if (!chartConfig) return
    
    updatePanelChartConfig(activePanelId, {
      seriesConfigs: {
        ...chartConfig.seriesConfigs,
        [runId]: {
          ...getSeriesConfig(runId),
          ...updates,
        },
      },
    })
  }

  // Handle slice selection toggle
  const handleToggleSliceSelection = (sliceId: string) => {
    if (activePanelId) {
      togglePanelSliceSelection(activePanelId, sliceId)
    }
  }

  // Handle slice color change
  const handleSliceColorChange = (sliceId: string, color: string, collectionId?: string) => {
    updateSliceColor(sliceId, color, collectionId)
  }

  // Handle slice rename
  const handleSliceRename = (sliceId: string, name: string, collectionId?: string) => {
    renameSlice(sliceId, name, collectionId)
  }

  // Handle slice delete
  const handleSliceDelete = (sliceId: string, collectionId?: string) => {
    deleteSlice(sliceId, collectionId)
  }

  // Calculate totals
  const totalRuns = sessions.reduce((acc, s) => acc + s.runs.length, 0)
  const selectedRuns = sessions.reduce(
    (acc, s) => acc + s.runs.filter((r) => r.selected || r.segmentInfo?.some(seg => seg.selected)).length,
    0
  )
  const collectionSliceCount = sliceCollections.reduce((acc, c) => acc + c.slices.length, 0)
  const totalSlices = collectionSliceCount + standaloneSlices.length
  const selectedSliceCount = selectedSliceIds.length

  return (
    <div className="flex flex-col h-full">
      {/* Summary Bar */}
      <div className="px-4 py-2 border-b border-vsc-border bg-vsc-sidebar-dark">
        <div className="flex items-center justify-between text-xs">
          <span className="text-vsc-fg-dim">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}, {selectedRuns}/{totalRuns} runs
          </span>
          <span className="text-vsc-fg-dim">
            {sliceCollections.length} collection{sliceCollections.length !== 1 ? 's' : ''}, {totalSlices} slice{totalSlices !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Test Data Section */}
        <CollapsibleSection
          title="Test Data"
          icon={<FolderOpen size={14} />}
          badge={selectedRuns > 0 ? selectedRuns : undefined}
        >
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <FolderOpen size={32} className="text-vsc-fg-muted/30 mb-2" />
              <p className="text-sm text-vsc-fg-dim mb-1">No workspace loaded</p>
              <p className="text-xs text-vsc-fg-muted">
                Open a workspace or folder to get started
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <SessionSection
                key={session.id}
                session={session}
                isExpanded={expandedSessions.has(session.id)}
                onToggleExpand={() => toggleSessionExpanded(session.id)}
                expandedRunIds={expandedRunIds}
                settingsExpandedRunIds={Array.from(settingsExpandedRunIds)}
                onToggleRunExpanded={(runId) => {
                  toggleRunExpanded(runId)
                  setExpandedRunIds(prev => 
                    prev.includes(runId) 
                      ? prev.filter(id => id !== runId)
                      : [...prev, runId]
                  )
                }}
                onToggleRunSettings={toggleRunSettings}
                onToggleRun={toggleRunSelection}
                onSelectAll={() => selectAllRuns(session.id)}
                onDeselectAll={() => deselectAllRuns(session.id)}
                onRunColorChange={handleRunColorChange}
                onSegmentToggle={toggleSegmentSelection}
                onSegmentColorChange={handleSegmentColorChange}
                getSeriesConfig={getSeriesConfig}
                onSeriesConfigUpdate={handleSeriesConfigUpdate}
                onOpenFileLocation={(filePath) => {
                  // TODO: Implement file location opening via Electron shell API
                  console.log('Open file location:', filePath)
                }}
              />
            ))
          )}
        </CollapsibleSection>

        {/* Slice Collections Section */}
        <CollapsibleSection
          title="Slice Collections"
          icon={<Scissors size={14} />}
          badge={sliceCollections.length > 0 ? sliceCollections.length : undefined}
        >
          {sliceCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Scissors size={32} className="text-vsc-fg-muted/30 mb-2" />
              <p className="text-sm text-vsc-fg-dim mb-1">No slice collections</p>
              <p className="text-xs text-vsc-fg-muted">
                Right-click on a chart to create slices
              </p>
            </div>
          ) : (
            sliceCollections.map((collection) => (
              <SliceCollectionItem
                key={collection.id}
                collection={collection}
                isExpanded={expandedCollectionIds.has(collection.id)}
                selectedSliceIds={selectedSliceIds}
                onToggleExpand={() => toggleCollectionExpanded(collection.id)}
                onToggleSliceSelection={handleToggleSliceSelection}
                onSliceColorChange={(sliceId, color) => handleSliceColorChange(sliceId, color, collection.id)}
                onSliceRename={(sliceId, name) => handleSliceRename(sliceId, name, collection.id)}
                onDeleteSlice={(sliceId) => handleSliceDelete(sliceId, collection.id)}
                onRenameCollection={(name) => renameSliceCollection(collection.id, name)}
                onDeleteCollection={() => deleteSliceCollection(collection.id)}
              />
            ))
          )}
        </CollapsibleSection>

        {/* Standalone Slices Section */}
        {standaloneSlices.length > 0 && (
          <CollapsibleSection
            title="Standalone Slices"
            icon={<Layers size={14} />}
            badge={standaloneSlices.length}
          >
            <div className="bg-vsc-bg">
              {standaloneSlices.map((slice) => (
                <SliceItem
                  key={slice.id}
                  slice={slice}
                  isSelected={selectedSliceIds.includes(slice.id)}
                  onToggleSelection={() => handleToggleSliceSelection(slice.id)}
                  onColorChange={(color) => handleSliceColorChange(slice.id, color)}
                  onRename={(name) => handleSliceRename(slice.id, name)}
                  onDelete={() => handleSliceDelete(slice.id)}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Summary */}
      {totalSlices > 0 && selectedSliceCount > 0 && (
        <div className="px-4 py-2 border-t border-vsc-border bg-vsc-sidebar-dark text-xs text-vsc-fg-dim">
          {selectedSliceCount} slice{selectedSliceCount !== 1 ? 's' : ''} selected for this panel
        </div>
      )}
    </div>
  )
}
