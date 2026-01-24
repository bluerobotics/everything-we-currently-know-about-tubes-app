import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseCSVWithSegments, RUN_COLORS } from '../lib/thrusterData'
import type { 
  ThrusterDataPoint, 
  TestRun, 
  TestSession,
  SegmentData 
} from '../lib/thrusterData'

// Re-export types for convenience
export type { ThrusterDataPoint, TestRun, TestSession, SegmentData }

// ============================================================================
// Workspace Types
// ============================================================================

// Saved panel configuration for workspace (uses paths instead of IDs for portability)
export interface WorkspacePanelConfig {
  id: string
  name: string
  selectedRunPaths: string[]  // File paths of selected runs (converted from IDs)
  selectedSegmentPaths: string[]  // Format: "filePath:segment-N" (converted from IDs)
  selectedSliceIds: string[]  // Individual slice IDs (tab-local, no path conversion needed)
  selectedSliceCollectionIds: string[]  // Legacy - kept for migration
  // Chart config with series configs keyed by file path
  chartConfig: Omit<ChartConfig, 'seriesConfigs'> & { 
    seriesConfigsByPath: Record<string, Omit<SeriesConfig, 'runId'>>
  }
  // Grid positioning for custom layouts
  gridArea?: GridArea
}

// Version 2 workspace format - uses file paths for stable identifiers (legacy)
export interface WorkspaceDataV2 {
  version: 2
  dataFolderPath: string | null
  // Path-based selections (stable across sessions)
  selectedRunPaths: string[]  // File paths of selected runs
  selectedSegmentPaths: string[]  // Format: "filePath:segment-N"
  expandedRunPaths: string[]
  // Series configs keyed by file path
  seriesConfigsByPath: Record<string, Omit<SeriesConfig, 'runId'>>
  // Chart config without seriesConfigs (those are in seriesConfigsByPath)
  chartConfig: Omit<ChartConfig, 'seriesConfigs'> & { seriesConfigs?: Record<string, SeriesConfig> }
  ui: {
    sidebarVisible: boolean
    sidebarWidth: number
    activeView: SidebarView
    inspectorPanelHeight: number
  }
}

// Version 3 workspace format - includes layout and multi-panel support
export interface WorkspaceData {
  version: 3  // Bumped to 3 for multi-panel layout support
  dataFolderPath: string | null
  // Global path-based selections (still maintained for backwards compat)
  selectedRunPaths: string[]  // File paths of selected runs
  selectedSegmentPaths: string[]  // Format: "filePath:segment-N"
  expandedRunPaths: string[]
  // Global series configs keyed by file path
  seriesConfigsByPath: Record<string, Omit<SeriesConfig, 'runId'>>
  // Global chart config without seriesConfigs (those are in seriesConfigsByPath)
  chartConfig: Omit<ChartConfig, 'seriesConfigs'> & { seriesConfigs?: Record<string, SeriesConfig> }
  // Layout state (new in v3)
  layoutType: LayoutType
  gridDimensions?: GridDimensions  // Grid size for custom layouts
  panels: Record<string, WorkspacePanelConfig>  // Panel configs with path-based keys
  activePanelId: string | null
  viewPresets: ViewPreset[]
  // Slices (cross-sectional analysis)
  slices?: Slice[]  // Standalone slices (not in any collection)
  sliceCollections?: SliceCollection[]
  selectedSliceCollectionIds?: string[]  // Legacy - kept for migration
  ui: {
    sidebarVisible: boolean
    sidebarWidth: number
    activeView: SidebarView
    inspectorPanelHeight: number
  }
}

// Type guard for version checking
type WorkspaceDataAny = WorkspaceDataV2 | WorkspaceData


// ============================================================================
// Type Definitions - Basic
// ============================================================================

export type SidebarView = 'series' | 'config' | 'layout'

// Available data columns from CSV
export type DataColumn = 'time' | 'pwm' | 'loadCell' | 'thrust' | 'voltage' | 'current' | 'rpm' | 'efficiency'

// Column display labels
export const COLUMN_LABELS: Record<DataColumn, string> = {
  time: 'Time (s)',
  pwm: 'PWM (μs)',
  loadCell: 'Load Cell (g)',
  thrust: 'Thrust (g)',
  voltage: 'Voltage (V)',
  current: 'Current (A)',
  rpm: 'RPM',
  efficiency: 'Efficiency (g/W)',
}

// Column units
export const COLUMN_UNITS: Record<DataColumn, string> = {
  time: 's',
  pwm: 'μs',
  loadCell: 'g',
  thrust: 'g',
  voltage: 'V',
  current: 'A',
  rpm: '',
  efficiency: 'g/W',
}

// ============================================================================
// Type Definitions - Slice (Cross-Sectional Analysis)
// ============================================================================

// A single data point within a slice, representing one segment's values at the slice X position
export interface SlicePoint {
  segmentId: string           // Original segment/run ID (e.g., "runId:segment-0" or just "runId")
  segmentName: string         // Display name (e.g., "T5-FW01 - Seg 1")
  color: string               // Inherited color from the segment
  values: Partial<Record<DataColumn, number>>  // All column values at this X position
}

// A slice captures values from all plotted segments at a specific X position
export interface Slice {
  id: string
  name: string                // e.g., "Slice @ 2.00s"
  xValue: number              // The X position (e.g., 2.0)
  xColumn: DataColumn         // Which column was the X axis (e.g., 'time')
  createdAt: number           // Timestamp when slice was created
  points: SlicePoint[]        // One entry per segment that was plotted when slice was created
  color?: string              // Optional custom color for the slice (overrides default)
}

// A collection of slices that can be plotted together
// Each original segment becomes a series, each slice becomes a data point
export interface SliceCollection {
  id: string
  name: string                // e.g., "Baseline Comparison"
  slices: Slice[]             // Ordered by xValue
  createdAt: number           // Timestamp when collection was created
}

// ============================================================================
// Type Definitions - Axis Configuration
// ============================================================================

export type ScaleType = 'linear' | 'log' | 'symlog'
export type LabelFormat = 'auto' | 'decimal0' | 'decimal1' | 'decimal2' | 'decimal3' | 'scientific' | 'engineering'

export interface AxisConfig {
  column: DataColumn
  scaleType: ScaleType
  autoRange: boolean
  min: number | null
  max: number | null
  labelFormat: LabelFormat
  label: string
  showAxis: boolean
  // Cursor snapping
  cursorSnapEnabled: boolean
  cursorSnapInterval: number
}

export interface SecondaryYAxisConfig extends AxisConfig {
  enabled: boolean
}

// ============================================================================
// Type Definitions - Series/Line Configuration
// ============================================================================

export type DashPattern = 'solid' | 'dashed' | 'dotted' | 'dashDot'
export type PointShape = 'circle' | 'square' | 'triangle' | 'diamond'
export type Interpolation = 'linear' | 'spline' | 'stepBefore' | 'stepAfter'

export interface SeriesConfig {
  runId: string
  color: string
  lineWidth: number
  dashPattern: DashPattern
  showPoints: boolean
  pointSize: number
  pointShape: PointShape
  fillArea: boolean
  fillOpacity: number
  interpolation: Interpolation
  connectGaps: boolean
  visible: boolean
  yAxisId: 'y' | 'y2'  // Primary or secondary Y axis
}

// Default series config
export const DEFAULT_SERIES_CONFIG: Omit<SeriesConfig, 'runId' | 'color'> = {
  lineWidth: 2,
  dashPattern: 'solid',
  showPoints: false,
  pointSize: 4,
  pointShape: 'circle',
  fillArea: false,
  fillOpacity: 20,
  interpolation: 'spline',
  connectGaps: true,
  visible: true,
  yAxisId: 'y',
}

// ============================================================================
// Type Definitions - Display Configuration
// ============================================================================

export type LegendPosition = 'top' | 'bottom' | 'left' | 'right' | 'none'
export type TooltipMode = 'nearest' | 'all' | 'none'
export type ZoomMode = 'x' | 'y' | 'xy' | 'none'
export type GridStyle = 'solid' | 'dashed' | 'dotted'

export interface DisplayConfig {
  // Grid
  showGridX: boolean
  showGridY: boolean
  gridStyle: GridStyle
  gridOpacity: number
  // Grid interval in data units (null = auto-scale)
  gridIntervalX: number | null
  gridIntervalY: number | null
  
  // Legend
  legendPosition: LegendPosition
  legendLive: boolean
  
  // Tooltip & Cursor
  tooltipMode: TooltipMode
  showCrosshair: boolean
  
  // Cursor follower markers (dots on each series)
  showCursorMarkers: boolean
  cursorMarkerSize: number
  
  // Zoom
  zoomMode: ZoomMode
  
  // Background
  backgroundColor: string
}

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showGridX: true,
  showGridY: true,
  gridStyle: 'solid',
  gridOpacity: 60,
  gridIntervalX: null,  // null = auto-scale
  gridIntervalY: null,  // null = auto-scale
  legendPosition: 'bottom',
  legendLive: true,
  tooltipMode: 'nearest',
  showCrosshair: true,
  showCursorMarkers: true,
  cursorMarkerSize: 4,  // Small dots, no border by default
  zoomMode: 'xy',
  backgroundColor: '#1e1e1e',
}

// ============================================================================
// Type Definitions - Data Configuration
// ============================================================================

export type DuplicateColumnHandling = 'first' | 'last' | 'average' | 'both'
export type SegmentMode = 'continuous' | 'separate'
export type NullHandling = 'skip' | 'interpolate' | 'zero'
export type DownsamplingMethod = 'none' | 'lttb' | 'minmax' | 'average'

export interface DataConfig {
  duplicateColumnHandling: DuplicateColumnHandling
  segmentMode: SegmentMode
  nullHandling: NullHandling
  downsamplingMethod: DownsamplingMethod
  maxPoints: number
}

export const DEFAULT_DATA_CONFIG: DataConfig = {
  duplicateColumnHandling: 'last',
  segmentMode: 'continuous',
  nullHandling: 'skip',
  downsamplingMethod: 'lttb',
  maxPoints: 2000,
}

// ============================================================================
// Type Definitions - Complete Chart Configuration
// ============================================================================

export interface ChartConfig {
  // Axis
  xAxis: AxisConfig
  yAxis: AxisConfig
  y2Axis: SecondaryYAxisConfig
  
  // Display
  display: DisplayConfig
  
  // Data
  data: DataConfig
  
  // Series configs per run (keyed by run ID)
  seriesConfigs: Record<string, SeriesConfig>
}

export const DEFAULT_X_AXIS: AxisConfig = {
  column: 'time',
  scaleType: 'linear',
  autoRange: true,
  min: null,
  max: null,
  labelFormat: 'decimal1',
  label: 'Time (s)',
  showAxis: true,
  cursorSnapEnabled: true,
  cursorSnapInterval: 0.1,
}

export const DEFAULT_Y_AXIS: AxisConfig = {
  column: 'thrust',
  scaleType: 'linear',
  autoRange: true,
  min: null,
  max: null,
  labelFormat: 'decimal2',
  label: 'Thrust (g)',
  showAxis: true,
  cursorSnapEnabled: false,
  cursorSnapInterval: 1,
}

export const DEFAULT_Y2_AXIS: SecondaryYAxisConfig = {
  enabled: false,
  column: 'current',
  scaleType: 'linear',
  autoRange: true,
  min: null,
  max: null,
  labelFormat: 'decimal2',
  label: 'Current (A)',
  showAxis: true,
  cursorSnapEnabled: false,
  cursorSnapInterval: 1,
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  xAxis: DEFAULT_X_AXIS,
  yAxis: DEFAULT_Y_AXIS,
  y2Axis: DEFAULT_Y2_AXIS,
  display: DEFAULT_DISPLAY_CONFIG,
  data: DEFAULT_DATA_CONFIG,
  seriesConfigs: {},
}

// ============================================================================
// Type Definitions - Layout & Panel Configuration
// ============================================================================

// Layout types for multi-panel views
export type LayoutType = 'single' | 'horizontal-2' | 'vertical-2' | 'quad' | 'grid-3x3' | 'grid-4x4' | 'custom'

// Grid area positioning for panels (CSS grid style, 1-based)
export interface GridArea {
  rowStart: number
  rowEnd: number    // exclusive (CSS grid convention)
  colStart: number
  colEnd: number    // exclusive
}

// Grid dimensions for custom layouts
export interface GridDimensions {
  rows: number
  cols: number
}

// Panel configuration - each panel is independent with its own data and chart settings
export interface PanelConfig {
  id: string
  name: string
  selectedRunIds: string[]
  selectedSegmentIds: string[]
  selectedSliceIds: string[]              // Individual slice IDs (from collections or standalone)
  selectedSliceCollectionIds: string[]    // Legacy - kept for migration
  chartConfig: ChartConfig
  // Grid positioning for custom layouts
  gridArea?: GridArea
}

// View presets for saving/loading layout configurations
export interface ViewPreset {
  id: string
  name: string
  createdAt: number
  type: 'layout' | 'panel'
  // For layout presets:
  layoutType?: LayoutType
  gridDimensions?: GridDimensions
  panels?: PanelConfig[]
  // For panel presets:
  panelConfig?: Omit<PanelConfig, 'id'>
}

// Helper to create a default panel configuration
export function createDefaultPanel(id: string, name: string, gridArea?: GridArea): PanelConfig {
  return {
    id,
    name,
    selectedRunIds: [],
    selectedSegmentIds: [],
    selectedSliceIds: [],
    selectedSliceCollectionIds: [],
    chartConfig: { ...DEFAULT_CHART_CONFIG },
    gridArea,
  }
}

// Get the number of panels for a given layout type (for non-custom layouts)
export function getPanelCountForLayout(layout: LayoutType): number {
  switch (layout) {
    case 'single': return 1
    case 'horizontal-2':
    case 'vertical-2': return 2
    case 'quad': return 4
    case 'grid-3x3': return 9
    case 'grid-4x4': return 16
    case 'custom': return 0  // Custom layouts don't have a fixed count
  }
}

// Get grid dimensions for a given layout type
export function getGridDimensionsForLayout(layout: LayoutType): GridDimensions {
  switch (layout) {
    case 'single': return { rows: 1, cols: 1 }
    case 'horizontal-2': return { rows: 1, cols: 2 }
    case 'vertical-2': return { rows: 2, cols: 1 }
    case 'quad': return { rows: 2, cols: 2 }
    case 'grid-3x3': return { rows: 3, cols: 3 }
    case 'grid-4x4': return { rows: 4, cols: 4 }
    case 'custom': return { rows: 4, cols: 4 }  // Default for custom
  }
}

// Initialize panels for a grid layout (one panel per cell)
export function initializeGridPanels(rows: number, cols: number): Record<string, PanelConfig> {
  const panels: Record<string, PanelConfig> = {}
  let panelNum = 1
  
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const panelId = `panel-${panelNum}`
      panels[panelId] = createDefaultPanel(panelId, `View ${panelNum}`, {
        rowStart: row,
        rowEnd: row + 1,
        colStart: col,
        colEnd: col + 1,
      })
      panelNum++
    }
  }
  
  return panels
}

// Check if two grid areas are adjacent (share an edge)
export function areGridAreasAdjacent(a: GridArea, b: GridArea): boolean {
  // Check if they share a horizontal edge
  const shareHorizontalEdge = (a.rowEnd === b.rowStart || b.rowEnd === a.rowStart) &&
    a.colStart < b.colEnd && b.colStart < a.colEnd
  
  // Check if they share a vertical edge
  const shareVerticalEdge = (a.colEnd === b.colStart || b.colEnd === a.colStart) &&
    a.rowStart < b.rowEnd && b.rowStart < a.rowEnd
  
  return shareHorizontalEdge || shareVerticalEdge
}

// Merge multiple grid areas into one bounding box
export function mergeGridAreas(areas: GridArea[]): GridArea {
  if (areas.length === 0) {
    return { rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 2 }
  }
  
  return {
    rowStart: Math.min(...areas.map(a => a.rowStart)),
    rowEnd: Math.max(...areas.map(a => a.rowEnd)),
    colStart: Math.min(...areas.map(a => a.colStart)),
    colEnd: Math.max(...areas.map(a => a.colEnd)),
  }
}

// Check if grid areas form a valid rectangle (can be merged)
export function canMergeGridAreas(areas: GridArea[]): boolean {
  if (areas.length < 2) return false
  
  const merged = mergeGridAreas(areas)
  const mergedCellCount = (merged.rowEnd - merged.rowStart) * (merged.colEnd - merged.colStart)
  const totalCellCount = areas.reduce((sum, a) => 
    sum + (a.rowEnd - a.rowStart) * (a.colEnd - a.colStart), 0)
  
  // The areas can be merged if they exactly fill the bounding rectangle
  return mergedCellCount === totalCellCount
}

// Split a panel's grid area back into individual 1x1 cells
export function splitGridArea(area: GridArea): GridArea[] {
  const cells: GridArea[] = []
  
  for (let row = area.rowStart; row < area.rowEnd; row++) {
    for (let col = area.colStart; col < area.colEnd; col++) {
      cells.push({
        rowStart: row,
        rowEnd: row + 1,
        colStart: col,
        colEnd: col + 1,
      })
    }
  }
  
  return cells
}

// ============================================================================
// Type Definitions - Workspace Tab (Multi-Tab Support)
// ============================================================================

// A workspace tab contains all the state for one workspace
export interface WorkspaceTab {
  id: string                    // Unique tab identifier (e.g., "tab-1678234567890")
  workspacePath: string | null  // File path if saved, null if untitled
  
  // Data
  dataFolderPath: string | null
  testSessions: TestSession[]
  isLoading: boolean
  loadError: string | null
  
  // Selections
  selectedRunIds: string[]
  selectedSegmentIds: string[]
  expandedRunIds: string[]
  
  // Chart config
  chartConfig: ChartConfig
  
  // Layout
  layoutType: LayoutType
  gridDimensions: GridDimensions  // Grid size for custom layouts
  panels: Record<string, PanelConfig>
  activePanelId: string | null
  viewPresets: ViewPreset[]
  
  // Inspector
  inspectedRunId: string | null
  inspectorPanelVisible: boolean
  
  // Slices (cross-sectional analysis)
  slices: Slice[]                       // Standalone slices (not in any collection)
  sliceCollections: SliceCollection[]   // Collections of related slices
  selectedSliceCollectionIds: string[]  // Legacy - kept for migration
}

// Helper to create a new default workspace tab
export function createDefaultTab(id?: string): WorkspaceTab {
  const tabId = id || `tab-${Date.now()}`
  return {
    id: tabId,
    workspacePath: null,
    
    // Data
    dataFolderPath: null,
    testSessions: [],
    isLoading: false,
    loadError: null,
    
    // Selections
    selectedRunIds: [],
    selectedSegmentIds: [],
    expandedRunIds: [],
    
    // Chart config
    chartConfig: { ...DEFAULT_CHART_CONFIG },
    
    // Layout
    layoutType: 'single',
    gridDimensions: { rows: 1, cols: 1 },
    panels: {
      'panel-1': createDefaultPanel('panel-1', 'Main View', { rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 2 }),
    },
    activePanelId: 'panel-1',
    viewPresets: [],
    
    // Inspector
    inspectedRunId: null,
    inspectorPanelVisible: false,
    
    // Slices
    slices: [],
    sliceCollections: [],
    selectedSliceCollectionIds: [],
  }
}

// ============================================================================
// Store Interface
// ============================================================================

interface AppState {
  // ============ MULTI-TAB STATE ============
  tabs: WorkspaceTab[]
  activeTabId: string
  
  // ============ GLOBAL UI STATE ============
  // (shared across all tabs)
  sidebarVisible: boolean
  sidebarWidth: number
  activeView: SidebarView
  
  // Hovered data point (for details panel)
  hoveredDataPoint: ThrusterDataPoint | null
  hoveredRunId: string | null
  
  // Inspector panel height (shared)
  inspectorPanelHeight: number
  
  // For auto-load on startup
  lastWorkspacePath: string | null
  
  // ============ AUTOSAVE STATE ============
  autosaveEnabled: boolean
  isSaving: boolean  // True when a save is in progress
  lastSaveTime: number | null  // Timestamp of last successful save
  
  // ============ TAB MANAGEMENT ACTIONS ============
  addTab: () => string                           // Creates new tab, returns tab ID
  closeTab: (tabId: string) => void              // Closes tab (prevents closing last tab)
  switchTab: (tabId: string) => void             // Switches active tab
  getActiveTab: () => WorkspaceTab | null        // Gets current tab data
  updateActiveTab: (updates: Partial<WorkspaceTab>) => void  // Update active tab state
  
  // ============ DATA LOADING ACTIONS ============
  // (operate on active tab)
  selectAndLoadDataFolder: () => Promise<void>
  loadDataFolder: (folderPath: string, options?: { skipAutoSelect?: boolean; restoreSelections?: boolean }) => Promise<void>
  loadRunData: (runId: string) => Promise<void>
  clearData: () => void
  
  // ============ RUN SELECTION ACTIONS ============
  toggleRunSelection: (runId: string) => void
  selectAllRuns: (sessionId: string) => void
  deselectAllRuns: (sessionId: string) => void
  
  // ============ SEGMENT SELECTION ACTIONS ============
  toggleRunExpanded: (runId: string) => void
  toggleSegmentSelection: (segmentId: string) => void  // segmentId format: "runId:segment-N"
  selectAllSegments: (runId: string) => void
  deselectAllSegments: (runId: string) => void
  
  // ============ BULK SELECTION ACTIONS ============
  setRunsSelected: (runIds: string[], selected: boolean) => Promise<void>
  setSegmentsSelected: (segmentIds: string[], selected: boolean) => Promise<void>
  
  // ============ CHART CONFIG ACTIONS ============
  setChartConfig: (config: Partial<ChartConfig>) => void
  setXAxisConfig: (config: Partial<AxisConfig>) => void
  setYAxisConfig: (config: Partial<AxisConfig>) => void
  setY2AxisConfig: (config: Partial<SecondaryYAxisConfig>) => void
  setDisplayConfig: (config: Partial<DisplayConfig>) => void
  setDataConfig: (config: Partial<DataConfig>) => void
  setSeriesConfig: (runId: string, config: Partial<SeriesConfig>) => void
  resetChartConfig: () => void
  
  // ============ LEGACY COMPAT ACTIONS ============
  setYAxisMetric: (metric: DataColumn) => void
  setShowGrid: (show: boolean) => void
  setShowPoints: (show: boolean) => void
  setSmoothLines: (smooth: boolean) => void
  
  // ============ UI ACTIONS ============
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setActiveView: (view: SidebarView) => void
  setHoveredDataPoint: (point: ThrusterDataPoint | null, runId: string | null) => void
  
  // ============ INSPECTOR ACTIONS ============
  setInspectedRun: (runId: string | null) => void
  toggleInspectorPanel: () => void
  setInspectorPanelHeight: (height: number) => void
  
  // ============ WORKSPACE ACTIONS ============
  saveWorkspace: () => Promise<boolean>  // Save active tab's workspace
  saveWorkspaceAs: () => Promise<boolean>  // Always prompt for path
  loadWorkspace: () => Promise<boolean>  // Open dialog and load into new tab
  loadWorkspaceFromPath: (path: string) => Promise<boolean>  // Load into new tab
  getWorkspaceData: () => WorkspaceData  // Get active tab's workspace state
  
  // ============ AUTOSAVE ACTIONS ============
  setAutosaveEnabled: (enabled: boolean) => void
  triggerAutosave: () => void  // Called internally when state changes
  
  // ============ LAYOUT ACTIONS ============
  setLayoutType: (type: LayoutType) => void
  setActivePanelId: (id: string | null) => void
  updatePanelConfig: (panelId: string, config: Partial<PanelConfig>) => void
  updatePanelChartConfig: (panelId: string, chartConfig: Partial<ChartConfig>) => void
  setPanelSelectedRuns: (panelId: string, runIds: string[]) => void
  togglePanelRunSelection: (panelId: string, runId: string) => Promise<void>
  mergePanels: (panelIds: string[]) => void  // Merge multiple panels into one
  splitPanel: (panelId: string) => void  // Split a merged panel back into cells
  saveViewPreset: (name: string, type: 'layout' | 'panel') => void
  loadViewPreset: (presetId: string) => void
  deleteViewPreset: (presetId: string) => void
  
  // ============ SLICE ACTIONS ============
  createSliceAtPosition: (xValue: number, xColumn: DataColumn, points: SlicePoint[], collectionId?: string | null) => string  // Returns slice ID
  createSliceFromSelection: (xColumn: DataColumn, xValue: number, segmentIds: string[], collectionId?: string | null) => string  // Returns slice ID - creates slice with ALL column data
  createStandaloneSlice: (slice: Omit<Slice, 'id' | 'createdAt'>) => string  // Creates standalone slice, returns ID
  createSliceCollection: (name: string, initialSlice?: Slice) => string  // Returns collection ID
  addSliceToCollection: (collectionId: string, slice: Slice) => void
  removeSliceFromCollection: (collectionId: string, sliceId: string) => void
  deleteSlice: (sliceId: string, collectionId?: string) => void  // Delete slice from collection or standalone
  deleteSliceCollection: (collectionId: string) => void
  renameSliceCollection: (collectionId: string, name: string) => void
  renameSlice: (sliceId: string, name: string, collectionId?: string) => void  // Updated signature
  updateSliceColor: (sliceId: string, color: string, collectionId?: string) => void  // Update slice color
  toggleSliceCollectionSelection: (collectionId: string) => void
  togglePanelSliceCollectionSelection: (panelId: string, collectionId: string) => void
  togglePanelSliceSelection: (panelId: string, sliceId: string) => void  // Toggle individual slice selection
  
  // ============ GETTERS ============
  getSelectedRuns: () => TestRun[]
  getRunById: (runId: string) => TestRun | null
  getRunColor: (runId: string) => string
  getSeriesConfig: (runId: string) => SeriesConfig
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all runs flattened from sessions
 */
function getAllRuns(sessions: TestSession[]): TestRun[] {
  return sessions.flatMap(s => s.runs)
}

/**
 * Get color for a run based on its global index
 */
function getColorForRun(runId: string, sessions: TestSession[]): string {
  const allRuns = getAllRuns(sessions)
  const index = allRuns.findIndex(r => r.id === runId)
  if (index === -1) return RUN_COLORS[0]
  return RUN_COLORS[index % RUN_COLORS.length]
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // ============ INTERNAL HELPER ============
      /**
       * Sync tab-level selections to the active panel.
       * This ensures that when users select items in the Data Series view,
       * the selections are reflected in the active chart panel.
       */
      const syncSelectionsToActivePanel = () => {
        const activeTab = get().getActiveTab()
        if (!activeTab?.activePanelId) return
        
        const panelId = activeTab.activePanelId
        const panel = activeTab.panels[panelId]
        if (!panel) return
        
        // Only sync if selections have actually changed
        const tabRunIds = activeTab.selectedRunIds
        const tabSegmentIds = activeTab.selectedSegmentIds
        const panelRunIds = panel.selectedRunIds
        const panelSegmentIds = panel.selectedSegmentIds
        
        const runIdsMatch = tabRunIds.length === panelRunIds.length && 
          tabRunIds.every((id, i) => panelRunIds[i] === id)
        const segmentIdsMatch = tabSegmentIds.length === panelSegmentIds.length && 
          tabSegmentIds.every((id, i) => panelSegmentIds[i] === id)
        
        if (runIdsMatch && segmentIdsMatch) return
        
        // Update the active panel with the tab-level selections
        get().updateActiveTab({
          panels: {
            ...activeTab.panels,
            [panelId]: {
              ...panel,
              selectedRunIds: [...tabRunIds],
              selectedSegmentIds: [...tabSegmentIds],
            },
          },
        })
      }
      
      return {
      // ============ MULTI-TAB STATE ============
      tabs: [createDefaultTab('tab-1')],
      activeTabId: 'tab-1',
      
      // ============ GLOBAL UI STATE ============
      sidebarVisible: true,
      sidebarWidth: 320,
      activeView: 'series' as SidebarView,
      
      hoveredDataPoint: null,
      hoveredRunId: null,
      
      inspectorPanelHeight: 250,
      lastWorkspacePath: null,
      
      // ============ AUTOSAVE STATE ============
      autosaveEnabled: true,
      isSaving: false,
      lastSaveTime: null,
      
      // ============ TAB MANAGEMENT ACTIONS ============
      addTab: () => {
        const newTab = createDefaultTab()
        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }))
        return newTab.id
      },
      
      closeTab: (tabId: string) => {
        const { tabs, activeTabId } = get()
        // Prevent closing the last tab
        if (tabs.length <= 1) return
        
        const newTabs = tabs.filter(t => t.id !== tabId)
        let newActiveTabId = activeTabId
        
        // If closing the active tab, switch to another one
        if (activeTabId === tabId) {
          const closedIndex = tabs.findIndex(t => t.id === tabId)
          // Try to select the tab to the left, or the first one
          newActiveTabId = newTabs[Math.max(0, closedIndex - 1)]?.id || newTabs[0]?.id
        }
        
        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })
      },
      
      switchTab: (tabId: string) => {
        const { tabs } = get()
        if (tabs.some(t => t.id === tabId)) {
          set({ activeTabId: tabId })
        }
      },
      
      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        return tabs.find(t => t.id === activeTabId) || null
      },
      
      updateActiveTab: (updates: Partial<WorkspaceTab>) => {
        const { tabs, activeTabId } = get()
        set({
          tabs: tabs.map(tab => 
            tab.id === activeTabId 
              ? { ...tab, ...updates }
              : tab
          ),
        })
      },
      
      // ============ DATA LOADING ACTIONS ============
      selectAndLoadDataFolder: async () => {
        if (!window.electronAPI) {
          get().updateActiveTab({ loadError: 'Electron API not available' })
          return
        }
        
        const result = await window.electronAPI.selectDataFolder()
        if (result.success && result.folderPath) {
          await get().loadDataFolder(result.folderPath)
        } else if (result.error) {
          get().updateActiveTab({ loadError: result.error })
        }
      },
      
      loadDataFolder: async (folderPath: string, options?: { skipAutoSelect?: boolean; restoreSelections?: boolean }) => {
        if (!window.electronAPI) {
          get().updateActiveTab({ loadError: 'Electron API not available' })
          return
        }
        
        const { skipAutoSelect, restoreSelections } = options || {}
        const { updateActiveTab, getActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        // Capture current selections before loading (for restoreSelections mode)
        const savedSelectedRunIds = activeTab.selectedRunIds
        const savedSelectedSegmentIds = activeTab.selectedSegmentIds
        const savedExpandedRunIds = activeTab.expandedRunIds
        const savedPanels = activeTab.panels
        
        updateActiveTab({ isLoading: true, loadError: null })
        
        try {
          const scanResult = await window.electronAPI.scanDataFolder(folderPath)
          
          if (!scanResult.success || !scanResult.sessions) {
            updateActiveTab({ isLoading: false, loadError: scanResult.error || 'Failed to scan folder' })
            return
          }
          
          // Convert metadata to full sessions (data will be loaded on demand)
          const sessions: TestSession[] = scanResult.sessions.map(sessionMeta => ({
            id: sessionMeta.id,
            name: sessionMeta.name,
            folderPath: sessionMeta.folderPath,
            runs: sessionMeta.runs.map(runMeta => ({
              id: runMeta.id,
              name: runMeta.name,
              filePath: runMeta.filePath,
              data: [], // Empty until loaded
              segments: 0,
            })),
          }))
          
          // Create default series configs for all runs
          const seriesConfigs: Record<string, SeriesConfig> = {}
          sessions.forEach(session => {
            session.runs.forEach((run) => {
              const globalIndex = getAllRuns(sessions).findIndex(r => r.id === run.id)
              seriesConfigs[run.id] = {
                ...DEFAULT_SERIES_CONFIG,
                runId: run.id,
                color: RUN_COLORS[globalIndex % RUN_COLORS.length],
              }
            })
          })
          
          // Build a set of valid run IDs from the newly scanned sessions
          const validRunIds = new Set(sessions.flatMap(s => s.runs.map(r => r.id)))
          
          if (skipAutoSelect || restoreSelections) {
            // When loading from workspace or restoring, preserve/restore selections
            const restoredSelectedRunIds = savedSelectedRunIds.filter(id => validRunIds.has(id))
            const restoredSelectedSegmentIds = savedSelectedSegmentIds.filter(id => {
              const runId = id.split(':segment-')[0]
              return validRunIds.has(runId)
            })
            const restoredExpandedRunIds = savedExpandedRunIds.filter(id => validRunIds.has(id))
            
            // Also restore panel selections, filtering for valid IDs
            const restoredPanels: Record<string, PanelConfig> = {}
            Object.entries(savedPanels).forEach(([panelId, panel]) => {
              restoredPanels[panelId] = {
                ...panel,
                selectedRunIds: panel.selectedRunIds.filter(id => validRunIds.has(id)),
                selectedSegmentIds: panel.selectedSegmentIds.filter(id => {
                  const runId = id.split(':segment-')[0]
                  return validRunIds.has(runId)
                }),
              }
            })
            
            const currentTab = getActiveTab()
            updateActiveTab({ 
              dataFolderPath: folderPath,
              testSessions: sessions,
              selectedRunIds: restoredSelectedRunIds,
              selectedSegmentIds: restoredSelectedSegmentIds,
              expandedRunIds: restoredExpandedRunIds,
              panels: restoredPanels,
              chartConfig: {
                ...currentTab?.chartConfig || DEFAULT_CHART_CONFIG,
                seriesConfigs,
              },
              isLoading: false,
              loadError: null,
            })
            
            // Load data for restored selections
            for (const runId of restoredSelectedRunIds) {
              await loadRunData(runId)
            }
            // Load data for segment selections' parent runs
            const segmentRunIds = new Set(
              restoredSelectedSegmentIds.map(id => id.split(':segment-')[0])
            )
            for (const runId of segmentRunIds) {
              await loadRunData(runId)
            }
            // Load data for panel selections
            for (const panel of Object.values(restoredPanels)) {
              for (const runId of panel.selectedRunIds) {
                await loadRunData(runId)
              }
              const panelSegmentRunIds = new Set(
                panel.selectedSegmentIds.map(id => id.split(':segment-')[0])
              )
              for (const runId of panelSegmentRunIds) {
                await loadRunData(runId)
              }
            }
          } else {
            // Normal folder open - auto-select first few runs
            const allRunIds = sessions.flatMap(s => s.runs.map(r => r.id))
            const autoSelectIds = allRunIds.slice(0, Math.min(3, allRunIds.length))
            
            const currentTab = getActiveTab()
            updateActiveTab({ 
              dataFolderPath: folderPath,
              testSessions: sessions,
              selectedRunIds: [], // Start with no selections
              selectedSegmentIds: [], // Clear segment selections on new folder
              chartConfig: {
                ...currentTab?.chartConfig || DEFAULT_CHART_CONFIG,
                seriesConfigs,
              },
              isLoading: false,
              loadError: null,
            })
            
            // Load data for auto-selected runs and select appropriately
            for (const runId of autoSelectIds) {
              await get().loadRunData(runId)
              
              // After loading, check if it has multiple segments
              const updatedTab = get().getActiveTab()
              const loadedRun = getAllRuns(updatedTab?.testSessions || []).find(r => r.id === runId)
              if (loadedRun?.segmentData && loadedRun.segmentData.length > 1) {
                // Has multiple segments - select all segments
                const segmentIds = loadedRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
                const currentActiveTab = get().getActiveTab()
                get().updateActiveTab({ 
                  selectedSegmentIds: [...(currentActiveTab?.selectedSegmentIds || []), ...segmentIds]
                })
              } else {
                // Single segment or no segments - select as full run
                const currentActiveTab = get().getActiveTab()
                get().updateActiveTab({ 
                  selectedRunIds: [...(currentActiveTab?.selectedRunIds || []), runId]
                })
              }
            }
          }
        } catch (error) {
          get().updateActiveTab({ 
            isLoading: false, 
            loadError: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      },
      
      loadRunData: async (runId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { testSessions } = activeTab
        
        // Find the run
        let targetRun: TestRun | null = null
        for (const session of testSessions) {
          const run = session.runs.find(r => r.id === runId)
          if (run) {
            targetRun = run
            break
          }
        }
        
        if (!targetRun || targetRun.data.length > 0) {
          // Run not found or already loaded
          return
        }
        
        if (!window.electronAPI) return
        
        try {
          const result = await window.electronAPI.readCSV(targetRun.filePath)
          
          if (result.success && result.content) {
            // Use the new segment-aware parser
            const parseResult = parseCSVWithSegments(result.content)
            
            // Update the run in the active tab with segment data
            updateActiveTab({
              testSessions: testSessions.map(session => ({
                ...session,
                runs: session.runs.map(run => 
                  run.id === runId 
                    ? { 
                        ...run, 
                        data: parseResult.data, 
                        segments: parseResult.segments,
                        segmentData: parseResult.segmentData,
                        columns: parseResult.columns,
                      }
                    : run
                ),
              })),
            })
          }
        } catch (error) {
          console.error('Failed to load run data:', error)
        }
      },
      
      clearData: () => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        updateActiveTab({
          dataFolderPath: null,
          testSessions: [],
          selectedRunIds: [],
          selectedSegmentIds: [],
          expandedRunIds: [],
          loadError: null,
          chartConfig: {
            ...activeTab.chartConfig,
            seriesConfigs: {},
          },
        })
      },
      
      // ============ RUN SELECTION ACTIONS ============
      toggleRunSelection: async (runId: string) => {
        const { getActiveTab, updateActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { selectedRunIds, selectedSegmentIds, testSessions } = activeTab
        
        // Check if currently selected (either as full run or any segments)
        const isFullRunSelected = selectedRunIds.includes(runId)
        const hasSelectedSegments = selectedSegmentIds.some(id => id.startsWith(`${runId}:segment-`))
        const isSelected = isFullRunSelected || hasSelectedSegments
        
        if (isSelected) {
          // Deselect - remove both full run and any segments
          updateActiveTab({ 
            selectedRunIds: selectedRunIds.filter(id => id !== runId),
            selectedSegmentIds: selectedSegmentIds.filter(id => !id.startsWith(`${runId}:segment-`))
          })
          syncSelectionsToActivePanel()
        } else {
          // First check if data is already loaded
          const existingRun = getAllRuns(testSessions).find(r => r.id === runId)
          
          // If data already loaded and has multiple segments, select all segments
          if (existingRun?.segmentData && existingRun.segmentData.length > 1) {
            const segmentIds = existingRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
            const currentTab = getActiveTab()
            updateActiveTab({ 
              selectedSegmentIds: [...new Set([...(currentTab?.selectedSegmentIds || []), ...segmentIds])]
            })
            syncSelectionsToActivePanel()
            return
          }
          
          // If data already loaded with single/no segments, select as full run
          if (existingRun?.data && existingRun.data.length > 0) {
            const currentTab = getActiveTab()
            updateActiveTab({ selectedRunIds: [...(currentTab?.selectedRunIds || []), runId] })
            syncSelectionsToActivePanel()
            return
          }
          
          // Data not loaded yet - load it first
          await loadRunData(runId)
          
          // Get updated run with segment data
          const updatedTab = getActiveTab()
          const updatedRun = getAllRuns(updatedTab?.testSessions || []).find(r => r.id === runId)
          
          // If it has multiple segments, select all segments instead of the full run
          if (updatedRun?.segmentData && updatedRun.segmentData.length > 1) {
            const segmentIds = updatedRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
            const currentTab = getActiveTab()
            updateActiveTab({ 
              selectedSegmentIds: [...new Set([...(currentTab?.selectedSegmentIds || []), ...segmentIds])]
            })
          } else {
            // Single segment or no segments - select as full run
            const currentTab = getActiveTab()
            updateActiveTab({ selectedRunIds: [...(currentTab?.selectedRunIds || []), runId] })
          }
          syncSelectionsToActivePanel()
        }
      },
      
      selectAllRuns: async (sessionId: string) => {
        const { getActiveTab, updateActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { testSessions, selectedRunIds } = activeTab
        const session = testSessions.find(s => s.id === sessionId)
        
        if (!session) return
        
        const sessionRunIds = session.runs.map(r => r.id)
        const newSelectedIds = [...new Set([...selectedRunIds, ...sessionRunIds])]
        
        updateActiveTab({ selectedRunIds: newSelectedIds })
        
        // Load data for newly selected runs
        for (const runId of sessionRunIds) {
          if (!selectedRunIds.includes(runId)) {
            await loadRunData(runId)
          }
        }
        syncSelectionsToActivePanel()
      },
      
      deselectAllRuns: (sessionId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { testSessions, selectedRunIds } = activeTab
        const session = testSessions.find(s => s.id === sessionId)
        
        if (!session) return
        
        const sessionRunIds = new Set(session.runs.map(r => r.id))
        updateActiveTab({ selectedRunIds: selectedRunIds.filter(id => !sessionRunIds.has(id)) })
        syncSelectionsToActivePanel()
      },
      
      // ============ SEGMENT SELECTION ACTIONS ============
      toggleRunExpanded: (runId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { expandedRunIds } = activeTab
        if (expandedRunIds.includes(runId)) {
          updateActiveTab({ expandedRunIds: expandedRunIds.filter(id => id !== runId) })
        } else {
          updateActiveTab({ expandedRunIds: [...expandedRunIds, runId] })
        }
      },
      
      toggleSegmentSelection: async (segmentId: string) => {
        // segmentId format: "runId:segment-N"
        const { getActiveTab, updateActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { selectedSegmentIds, selectedRunIds } = activeTab
        const [runId] = segmentId.split(':segment-')
        
        if (selectedSegmentIds.includes(segmentId)) {
          // Deselect segment
          updateActiveTab({ selectedSegmentIds: selectedSegmentIds.filter(id => id !== segmentId) })
          syncSelectionsToActivePanel()
        } else {
          // Select segment - also ensure run data is loaded
          updateActiveTab({ selectedSegmentIds: [...selectedSegmentIds, segmentId] })
          
          // Remove the parent run from selectedRunIds if it was selected
          if (selectedRunIds.includes(runId)) {
            const currentTab = getActiveTab()
            updateActiveTab({ selectedRunIds: (currentTab?.selectedRunIds || []).filter(id => id !== runId) })
          }
          
          // Ensure run data is loaded
          await loadRunData(runId)
          syncSelectionsToActivePanel()
        }
      },
      
      selectAllSegments: async (runId: string) => {
        const { getActiveTab, updateActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { testSessions } = activeTab
        
        // Find the run
        const allRuns = getAllRuns(testSessions)
        const run = allRuns.find(r => r.id === runId)
        if (!run) return
        
        // Ensure data is loaded
        await loadRunData(runId)
        
        // Get updated run with segment data
        const updatedTab = getActiveTab()
        const updatedRun = getAllRuns(updatedTab?.testSessions || []).find(r => r.id === runId)
        if (!updatedRun?.segmentData) return
        
        // Create segment IDs
        const segmentIds = updatedRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
        const currentTab = getActiveTab()
        const newSelectedSegmentIds = [...new Set([...(currentTab?.selectedSegmentIds || []), ...segmentIds])]
        
        // Remove parent run from selection when using segments
        const newSelectedRunIds = (currentTab?.selectedRunIds || []).filter(id => id !== runId)
        
        updateActiveTab({ 
          selectedSegmentIds: newSelectedSegmentIds,
          selectedRunIds: newSelectedRunIds,
        })
        syncSelectionsToActivePanel()
      },
      
      deselectAllSegments: (runId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        updateActiveTab({ 
          selectedSegmentIds: activeTab.selectedSegmentIds.filter(id => !id.startsWith(`${runId}:segment-`))
        })
        syncSelectionsToActivePanel()
      },
      
      // ============ BULK SELECTION ACTIONS ============
      setRunsSelected: async (runIds: string[], selected: boolean) => {
        const { getActiveTab, updateActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { selectedRunIds, selectedSegmentIds, testSessions } = activeTab
        
        if (selected) {
          // Selecting multiple runs
          const newSelectedRunIds = [...selectedRunIds]
          const newSelectedSegmentIds = [...selectedSegmentIds]
          
          for (const runId of runIds) {
            // Check if data is already loaded
            const existingRun = getAllRuns(testSessions).find(r => r.id === runId)
            
            // If data already loaded and has multiple segments, select all segments
            if (existingRun?.segmentData && existingRun.segmentData.length > 1) {
              const segmentIds = existingRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
              segmentIds.forEach(segId => {
                if (!newSelectedSegmentIds.includes(segId)) {
                  newSelectedSegmentIds.push(segId)
                }
              })
              continue
            }
            
            // If data already loaded with single/no segments, select as full run
            if (existingRun?.data && existingRun.data.length > 0) {
              if (!newSelectedRunIds.includes(runId)) {
                newSelectedRunIds.push(runId)
              }
              continue
            }
            
            // Data not loaded yet - load it first
            await loadRunData(runId)
            
            // Get updated run with segment data
            const updatedTab = getActiveTab()
            const updatedRun = getAllRuns(updatedTab?.testSessions || []).find(r => r.id === runId)
            
            // If it has multiple segments, select all segments
            if (updatedRun?.segmentData && updatedRun.segmentData.length > 1) {
              const segmentIds = updatedRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
              segmentIds.forEach(segId => {
                const currentTab = getActiveTab()
                if (!(currentTab?.selectedSegmentIds || []).includes(segId)) {
                  updateActiveTab({ selectedSegmentIds: [...(currentTab?.selectedSegmentIds || []), segId] })
                }
              })
            } else {
              // Single segment or no segments - select as full run
              const currentTab = getActiveTab()
              if (!(currentTab?.selectedRunIds || []).includes(runId)) {
                updateActiveTab({ selectedRunIds: [...(currentTab?.selectedRunIds || []), runId] })
              }
            }
          }
          
          updateActiveTab({ 
            selectedRunIds: [...new Set(newSelectedRunIds)],
            selectedSegmentIds: [...new Set(newSelectedSegmentIds)]
          })
        } else {
          // Deselecting multiple runs - remove both full run and any segments
          const runIdSet = new Set(runIds)
          updateActiveTab({ 
            selectedRunIds: selectedRunIds.filter(id => !runIdSet.has(id)),
            selectedSegmentIds: selectedSegmentIds.filter(id => {
              const [runId] = id.split(':segment-')
              return !runIdSet.has(runId)
            })
          })
        }
        syncSelectionsToActivePanel()
      },
      
      setSegmentsSelected: async (segmentIds: string[], selected: boolean) => {
        const { getActiveTab, updateActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { selectedSegmentIds, selectedRunIds } = activeTab
        
        if (selected) {
          // Selecting multiple segments
          const newSelectedSegmentIds = [...selectedSegmentIds]
          const runIdsToUnselect = new Set<string>()
          const runIdsToLoad = new Set<string>()
          
          for (const segmentId of segmentIds) {
            const [runId] = segmentId.split(':segment-')
            runIdsToLoad.add(runId)
            runIdsToUnselect.add(runId)
            
            if (!newSelectedSegmentIds.includes(segmentId)) {
              newSelectedSegmentIds.push(segmentId)
            }
          }
          
          // Load run data if needed
          for (const runId of runIdsToLoad) {
            await loadRunData(runId)
          }
          
          // Remove parent runs from full-run selection (when using segments)
          const newSelectedRunIds = selectedRunIds.filter(id => !runIdsToUnselect.has(id))
          
          updateActiveTab({ 
            selectedSegmentIds: [...new Set(newSelectedSegmentIds)],
            selectedRunIds: newSelectedRunIds
          })
        } else {
          // Deselecting multiple segments
          const segmentIdSet = new Set(segmentIds)
          updateActiveTab({ 
            selectedSegmentIds: selectedSegmentIds.filter(id => !segmentIdSet.has(id))
          })
        }
        syncSelectionsToActivePanel()
      },
      
      // ============ CHART CONFIG ACTIONS ============
      setChartConfig: (config) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: { ...activeTab.chartConfig, ...config }
        })
      },
      
      setXAxisConfig: (config) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            xAxis: { ...activeTab.chartConfig.xAxis, ...config }
          }
        })
      },
      
      setYAxisConfig: (config) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            yAxis: { ...activeTab.chartConfig.yAxis, ...config }
          }
        })
      },
      
      setY2AxisConfig: (config) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            y2Axis: { ...activeTab.chartConfig.y2Axis, ...config }
          }
        })
      },
      
      setDisplayConfig: (config) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            display: { ...activeTab.chartConfig.display, ...config }
          }
        })
      },
      
      setDataConfig: (config) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            data: { ...activeTab.chartConfig.data, ...config }
          }
        })
      },
      
      setSeriesConfig: (runId, config) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            seriesConfigs: {
              ...activeTab.chartConfig.seriesConfigs,
              [runId]: {
                ...activeTab.chartConfig.seriesConfigs[runId],
                ...config,
              }
            }
          }
        })
      },
      
      resetChartConfig: () => {
        const { updateActiveTab } = get()
        updateActiveTab({
          chartConfig: DEFAULT_CHART_CONFIG
        })
      },
      
      // ============ LEGACY COMPAT ACTIONS ============
      setYAxisMetric: (metric) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            yAxis: {
              ...activeTab.chartConfig.yAxis,
              column: metric,
              label: COLUMN_LABELS[metric],
            }
          }
        })
      },
      
      setShowGrid: (show) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            display: {
              ...activeTab.chartConfig.display,
              showGridX: show,
              showGridY: show,
            }
          }
        })
      },
      
      setShowPoints: (show) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        const updatedSeriesConfigs = { ...activeTab.chartConfig.seriesConfigs }
        Object.keys(updatedSeriesConfigs).forEach(runId => {
          updatedSeriesConfigs[runId] = {
            ...updatedSeriesConfigs[runId],
            showPoints: show,
          }
        })
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            seriesConfigs: updatedSeriesConfigs,
          }
        })
      },
      
      setSmoothLines: (smooth) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        const updatedSeriesConfigs = { ...activeTab.chartConfig.seriesConfigs }
        Object.keys(updatedSeriesConfigs).forEach(runId => {
          updatedSeriesConfigs[runId] = {
            ...updatedSeriesConfigs[runId],
            interpolation: smooth ? 'spline' : 'linear',
          }
        })
        updateActiveTab({
          chartConfig: {
            ...activeTab.chartConfig,
            seriesConfigs: updatedSeriesConfigs,
          }
        })
      },
      
      // ============ UI ACTIONS ============
      toggleSidebar: () => set(s => ({ sidebarVisible: !s.sidebarVisible })),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(280, Math.min(500, width)) }),
      setActiveView: (view) => set({ activeView: view, sidebarVisible: true }),
      setHoveredDataPoint: (point, runId) => set({ hoveredDataPoint: point, hoveredRunId: runId }),
      
      // ============ INSPECTOR ACTIONS ============
      setInspectedRun: (runId) => {
        const { updateActiveTab } = get()
        updateActiveTab({ 
          inspectedRunId: runId, 
          inspectorPanelVisible: runId !== null 
        })
      },
      toggleInspectorPanel: () => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        updateActiveTab({ inspectorPanelVisible: !activeTab.inspectorPanelVisible })
      },
      setInspectorPanelHeight: (height) => set({ inspectorPanelHeight: Math.max(150, Math.min(500, height)) }),
      
      // ============ WORKSPACE ACTIONS ============
      // Note: newWorkspace is removed - use addTab instead
      
      getWorkspaceData: (): WorkspaceData => {
        const { getActiveTab, sidebarVisible, sidebarWidth, activeView, inspectorPanelHeight } = get()
        const activeTab = getActiveTab()
        
        // Return empty workspace data if no active tab
        if (!activeTab) {
          return {
            version: 3,
            dataFolderPath: null,
            selectedRunPaths: [],
            selectedSegmentPaths: [],
            expandedRunPaths: [],
            seriesConfigsByPath: {},
            chartConfig: DEFAULT_CHART_CONFIG,
            layoutType: 'single',
            gridDimensions: { rows: 1, cols: 1 },
            panels: {},
            activePanelId: null,
            viewPresets: [],
            sliceCollections: [],
            selectedSliceCollectionIds: [],
            ui: { sidebarVisible, sidebarWidth, activeView, inspectorPanelHeight },
          }
        }
        
        // Build ID -> filePath mapping
        const idToPath = new Map<string, string>()
        activeTab.testSessions.forEach(session => {
          session.runs.forEach(run => {
            idToPath.set(run.id, run.filePath)
          })
        })
        
        // Helper to convert run IDs to paths
        const convertRunIdsToPaths = (runIds: string[]): string[] => {
          return runIds
            .map(id => idToPath.get(id))
            .filter((path): path is string => path !== undefined)
        }
        
        // Helper to convert segment IDs to paths
        const convertSegmentIdsToPaths = (segmentIds: string[]): string[] => {
          return segmentIds
            .map(segId => {
              const [runId, segmentPart] = segId.split(':segment-')
              const filePath = idToPath.get(runId)
              if (filePath) {
                return `${filePath}:segment-${segmentPart}`
              }
              return undefined
            })
            .filter((path): path is string => path !== undefined)
        }
        
        // Helper to convert seriesConfigs to path-keyed format
        const convertSeriesConfigsToPath = (
          seriesConfigs: Record<string, SeriesConfig>
        ): Record<string, Omit<SeriesConfig, 'runId'>> => {
          const result: Record<string, Omit<SeriesConfig, 'runId'>> = {}
          Object.entries(seriesConfigs).forEach(([runId, config]) => {
            const filePath = idToPath.get(runId)
            if (filePath) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { runId: _, ...configWithoutRunId } = config
              result[filePath] = configWithoutRunId
            }
          })
          return result
        }
        
        // Convert selectedRunIds to file paths
        const selectedRunPaths = convertRunIdsToPaths(activeTab.selectedRunIds)
        
        // Convert selectedSegmentIds to path-based format
        const selectedSegmentPaths = convertSegmentIdsToPaths(activeTab.selectedSegmentIds)
        
        // Convert expandedRunIds to file paths
        const expandedRunPaths = convertRunIdsToPaths(activeTab.expandedRunIds)
        
        // Convert seriesConfigs from ID-keyed to path-keyed
        const seriesConfigsByPath = convertSeriesConfigsToPath(activeTab.chartConfig.seriesConfigs)
        
        // Extract chartConfig without seriesConfigs (we store them separately by path)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { seriesConfigs: _, ...chartConfigWithoutSeries } = activeTab.chartConfig
        
        // Convert panels to workspace format with path-based selections
        const workspacePanels: Record<string, WorkspacePanelConfig> = {}
        Object.entries(activeTab.panels).forEach(([panelId, panel]) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { seriesConfigs: panelSeriesConfigs, ...panelChartConfigWithoutSeries } = panel.chartConfig
          
          workspacePanels[panelId] = {
            id: panel.id,
            name: panel.name,
            selectedRunPaths: convertRunIdsToPaths(panel.selectedRunIds),
            selectedSegmentPaths: convertSegmentIdsToPaths(panel.selectedSegmentIds),
            selectedSliceIds: panel.selectedSliceIds ?? [],
            selectedSliceCollectionIds: panel.selectedSliceCollectionIds ?? [],
            chartConfig: {
              ...panelChartConfigWithoutSeries,
              seriesConfigsByPath: convertSeriesConfigsToPath(panelSeriesConfigs),
            },
            gridArea: panel.gridArea,
          }
        })
        
        return {
          version: 3,
          dataFolderPath: activeTab.dataFolderPath,
          selectedRunPaths,
          selectedSegmentPaths,
          expandedRunPaths,
          seriesConfigsByPath,
          chartConfig: chartConfigWithoutSeries,
          layoutType: activeTab.layoutType,
          gridDimensions: activeTab.gridDimensions,
          panels: workspacePanels,
          activePanelId: activeTab.activePanelId,
          viewPresets: activeTab.viewPresets,
          slices: activeTab.slices,
          sliceCollections: activeTab.sliceCollections,
          selectedSliceCollectionIds: activeTab.selectedSliceCollectionIds,
          ui: {
            sidebarVisible,
            sidebarWidth,
            activeView,
            inspectorPanelHeight,
          }
        }
      },
      
      saveWorkspace: async () => {
        if (!window.electronAPI) return false
        
        const { getActiveTab, getWorkspaceData, isSaving } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return false
        
        // Prevent concurrent saves
        if (isSaving) return false
        
        set({ isSaving: true })
        
        try {
          const data = JSON.stringify(getWorkspaceData(), null, 2)
          
          if (activeTab.workspacePath) {
            // Save to existing path
            const result = await window.electronAPI.saveToPath(data, activeTab.workspacePath)
            if (result.success) {
              set({ lastSaveTime: Date.now() })
            }
            return result.success
          } else {
            // No current path, use Save As
            return get().saveWorkspaceAs()
          }
        } finally {
          set({ isSaving: false })
        }
      },
      
      saveWorkspaceAs: async () => {
        if (!window.electronAPI) return false
        
        const { getActiveTab, updateActiveTab, getWorkspaceData } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return false
        
        set({ isSaving: true })
        
        try {
          const data = JSON.stringify(getWorkspaceData(), null, 2)
          
          const result = await window.electronAPI.saveConfig(data, 'workspace.thruster')
          
          if (result.success && result.filePath) {
            updateActiveTab({ workspacePath: result.filePath })
            set({ lastWorkspacePath: result.filePath, lastSaveTime: Date.now() })
            return true
          }
          return false
        } finally {
          set({ isSaving: false })
        }
      },
      
      // ============ AUTOSAVE ACTIONS ============
      setAutosaveEnabled: (enabled: boolean) => {
        set({ autosaveEnabled: enabled })
      },
      
      triggerAutosave: () => {
        const { autosaveEnabled, getActiveTab, saveWorkspace } = get()
        const activeTab = getActiveTab()
        
        // Only autosave if enabled and workspace has been saved at least once
        if (autosaveEnabled && activeTab?.workspacePath) {
          saveWorkspace()
        }
      },
      
      loadWorkspace: async () => {
        if (!window.electronAPI) return false
        
        const result = await window.electronAPI.loadConfig()
        
        if (result.success && result.data && result.filePath) {
          // Validate it's valid JSON before loading
          try {
            JSON.parse(result.data)
            return get().loadWorkspaceFromPath(result.filePath)
          } catch (e) {
            console.error('Failed to parse workspace:', e)
            return false
          }
        }
        return false
      },
      
      loadWorkspaceFromPath: async (workspacePath: string) => {
        if (!window.electronAPI) return false
        
        try {
          const result = await window.electronAPI.loadRecentFile(workspacePath)
          
          if (!result.success || !result.data) {
            console.error('[loadWorkspaceFromPath] Failed to load workspace file:', result.error)
            return false
          }
          
          const workspaceRaw = JSON.parse(result.data) as WorkspaceDataAny
          const workspaceVersion = workspaceRaw.version ?? 2  // Default to v2 for older files
          
          // Check if this workspace is already open in a tab
          const { tabs } = get()
          const existingTab = tabs.find(t => t.workspacePath === workspacePath)
          if (existingTab) {
            // Switch to existing tab instead of loading again
            get().switchTab(existingTab.id)
            return true
          }
          
          // Create a new tab for this workspace
          get().addTab()
          
          // Apply global UI settings
          set({
            lastWorkspacePath: workspacePath,
            sidebarVisible: workspaceRaw.ui?.sidebarVisible ?? true,
            sidebarWidth: workspaceRaw.ui?.sidebarWidth ?? 320,
            activeView: workspaceRaw.ui?.activeView ?? 'series',
            inspectorPanelHeight: workspaceRaw.ui?.inspectorPanelHeight ?? 250,
          })
          
          // Set the workspace path on the new tab
          get().updateActiveTab({ workspacePath })
          
          // Load the data folder if specified (without auto-selecting)
          if (workspaceRaw.dataFolderPath) {
            await get().loadDataFolder(workspaceRaw.dataFolderPath, { skipAutoSelect: true })
            
            // Build path -> ID mapping from loaded sessions
            const activeTab = get().getActiveTab()
            const pathToId = new Map<string, string>()
            activeTab?.testSessions.forEach(session => {
              session.runs.forEach(run => {
                pathToId.set(run.filePath, run.id)
              })
            })
            
            // Helper to convert paths back to run IDs
            const convertPathsToRunIds = (paths: string[]): string[] => {
              return (paths || [])
                .map(path => pathToId.get(path))
                .filter((id): id is string => id !== undefined)
            }
            
            // Helper to convert segment paths to segment IDs
            const convertPathsToSegmentIds = (segmentPaths: string[]): string[] => {
              return (segmentPaths || [])
                .map(segPath => {
                  const lastColonIndex = segPath.lastIndexOf(':segment-')
                  if (lastColonIndex === -1) return undefined
                  const filePath = segPath.substring(0, lastColonIndex)
                  const segmentPart = segPath.substring(lastColonIndex + 1) // "segment-N"
                  const runId = pathToId.get(filePath)
                  if (runId) {
                    return `${runId}:${segmentPart}`
                  }
                  return undefined
                })
                .filter((id): id is string => id !== undefined)
            }
            
            // Helper to rebuild seriesConfigs with current IDs
            const rebuildSeriesConfigs = (
              seriesConfigsByPath: Record<string, Omit<SeriesConfig, 'runId'>> | undefined
            ): Record<string, SeriesConfig> => {
              const result: Record<string, SeriesConfig> = {}
              if (seriesConfigsByPath) {
                Object.entries(seriesConfigsByPath).forEach(([filePath, config]) => {
                  const runId = pathToId.get(filePath)
                  if (runId) {
                    result[runId] = {
                      ...config,
                      runId,
                    }
                  }
                })
              }
              return result
            }
            
            // Convert paths back to IDs
            const selectedRunIds = convertPathsToRunIds(workspaceRaw.selectedRunPaths)
            const selectedSegmentIds = convertPathsToSegmentIds(workspaceRaw.selectedSegmentPaths)
            const expandedRunIds = convertPathsToRunIds(workspaceRaw.expandedRunPaths)
            
            // Rebuild seriesConfigs with current IDs
            const seriesConfigs = rebuildSeriesConfigs(workspaceRaw.seriesConfigsByPath)
            
            // Apply chart config and selections
            const chartConfigBase = workspaceRaw.chartConfig || DEFAULT_CHART_CONFIG
            
            // Handle version-specific loading
            let layoutType: LayoutType = 'single'
            let panels: Record<string, PanelConfig> = {}
            let activePanelId: string | null = null
            let viewPresets: ViewPreset[] = []
            
            // Slice data (will be populated for v3+)
            let sliceCollections: SliceCollection[] = []
            let standaloneSlices: Slice[] = []
            let selectedSliceCollectionIds: string[] = []
            
            // Track gridDimensions
            let gridDimensions: GridDimensions = { rows: 1, cols: 1 }
            
            if (workspaceVersion >= 3) {
              // Version 3: Load layout and panel configurations
              const workspace = workspaceRaw as WorkspaceData
              layoutType = workspace.layoutType || 'single'
              gridDimensions = workspace.gridDimensions || getGridDimensionsForLayout(layoutType)
              viewPresets = workspace.viewPresets || []
              sliceCollections = workspace.sliceCollections || []
              standaloneSlices = workspace.slices || []
              selectedSliceCollectionIds = workspace.selectedSliceCollectionIds || []
              
              // Convert workspace panels back to runtime panels
              if (workspace.panels) {
                Object.entries(workspace.panels).forEach(([panelId, workspacePanel]) => {
                  const panelSeriesConfigs = rebuildSeriesConfigs(
                    workspacePanel.chartConfig.seriesConfigsByPath
                  )
                  
                  // Extract chartConfig without seriesConfigsByPath, add back seriesConfigs
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { seriesConfigsByPath: _, ...panelChartConfigRest } = workspacePanel.chartConfig
                  
                  // Migrate: If we have selectedSliceCollectionIds but no selectedSliceIds,
                  // extract all slice IDs from the selected collections
                  let migratedSliceIds = workspacePanel.selectedSliceIds ?? []
                  if (migratedSliceIds.length === 0 && workspacePanel.selectedSliceCollectionIds?.length) {
                    for (const collectionId of workspacePanel.selectedSliceCollectionIds) {
                      const collection = sliceCollections.find(c => c.id === collectionId)
                      if (collection) {
                        migratedSliceIds = [...migratedSliceIds, ...collection.slices.map(s => s.id)]
                      }
                    }
                  }
                  
                  panels[panelId] = {
                    id: workspacePanel.id,
                    name: workspacePanel.name,
                    selectedRunIds: convertPathsToRunIds(workspacePanel.selectedRunPaths),
                    selectedSegmentIds: convertPathsToSegmentIds(workspacePanel.selectedSegmentPaths),
                    selectedSliceIds: migratedSliceIds,
                    selectedSliceCollectionIds: workspacePanel.selectedSliceCollectionIds ?? [],
                    chartConfig: {
                      ...panelChartConfigRest,
                      seriesConfigs: panelSeriesConfigs,
                    },
                    gridArea: workspacePanel.gridArea,
                  }
                })
              }
              
              activePanelId = workspace.activePanelId || Object.keys(panels)[0] || null
            } else {
              // Version 2 or older: Migrate to single panel with old selections
              // Migrate: Extract all slice IDs from selected collections
              let migratedSliceIds: string[] = []
              for (const collectionId of selectedSliceCollectionIds) {
                const collection = sliceCollections.find(c => c.id === collectionId)
                if (collection) {
                  migratedSliceIds = [...migratedSliceIds, ...collection.slices.map(s => s.id)]
                }
              }
              
              panels['panel-1'] = {
                id: 'panel-1',
                name: 'Main View',
                selectedRunIds: [...selectedRunIds],
                selectedSegmentIds: [...selectedSegmentIds],
                selectedSliceIds: migratedSliceIds,
                selectedSliceCollectionIds: [...selectedSliceCollectionIds],  // Legacy - kept for reference
                chartConfig: {
                  ...chartConfigBase,
                  seriesConfigs,
                },
              }
              activePanelId = 'panel-1'
            }
            
            // If no panels were loaded, create a default one
            if (Object.keys(panels).length === 0) {
              panels['panel-1'] = createDefaultPanel('panel-1', 'Main View')
              activePanelId = 'panel-1'
            }
            
            // Update the active tab with all workspace state
            get().updateActiveTab({
              selectedRunIds,
              selectedSegmentIds,
              expandedRunIds,
              chartConfig: {
                ...chartConfigBase,
                seriesConfigs,
              },
              layoutType,
              gridDimensions,
              panels,
              activePanelId,
              viewPresets,
              slices: standaloneSlices,
              sliceCollections,
              selectedSliceCollectionIds,
            })
            
            // Load data for selected runs
            const { loadRunData } = get()
            for (const runId of selectedRunIds) {
              await loadRunData(runId)
            }
            
            // Load data for selected segments' parent runs
            const segmentRunIds = new Set(
              selectedSegmentIds.map(id => id.split(':segment-')[0])
            )
            for (const runId of segmentRunIds) {
              await loadRunData(runId)
            }
            
            // Load data for panel-specific selections
            for (const panel of Object.values(panels)) {
              for (const runId of panel.selectedRunIds) {
                await loadRunData(runId)
              }
              const panelSegmentRunIds = new Set(
                panel.selectedSegmentIds.map(id => id.split(':segment-')[0])
              )
              for (const runId of panelSegmentRunIds) {
                await loadRunData(runId)
              }
            }
          }
          
          return true
        } catch (e) {
          console.error('Failed to load workspace:', e)
          return false
        }
      },
      
      // ============ LAYOUT ACTIONS ============
      setLayoutType: (type: LayoutType) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const gridDimensions = getGridDimensionsForLayout(type)
        
        // For grid layouts (3x3, 4x4, custom), initialize all cells as separate panels
        if (type === 'grid-3x3' || type === 'grid-4x4' || type === 'custom') {
          const newPanels = initializeGridPanels(gridDimensions.rows, gridDimensions.cols)
          updateActiveTab({
            layoutType: type,
            gridDimensions,
            panels: newPanels,
            activePanelId: 'panel-1',
          })
          return
        }
        
        // For simple layouts (single, horizontal-2, vertical-2, quad), use the old logic
        // but add grid areas for CSS grid compatibility
        const { panels, activePanelId } = activeTab
        const currentCount = Object.keys(panels).length
        const targetCount = getPanelCountForLayout(type)
        
        let newPanels: Record<string, PanelConfig> = {}
        let newActivePanelId = activePanelId
        
        // Create panels with proper grid areas
        let panelNum = 0
        for (let row = 1; row <= gridDimensions.rows; row++) {
          for (let col = 1; col <= gridDimensions.cols; col++) {
            panelNum++
            const panelId = `panel-${panelNum}`
            const existingPanel = panels[panelId]
            
            if (existingPanel) {
              // Keep existing panel data but update grid area
              newPanels[panelId] = {
                ...existingPanel,
                gridArea: {
                  rowStart: row,
                  rowEnd: row + 1,
                  colStart: col,
                  colEnd: col + 1,
                },
              }
            } else {
              // Create new panel
              newPanels[panelId] = createDefaultPanel(panelId, `View ${panelNum}`, {
                rowStart: row,
                rowEnd: row + 1,
                colStart: col,
                colEnd: col + 1,
              })
            }
          }
        }
        
        // Adjust active panel if needed
        if (targetCount < currentCount) {
          if (activePanelId && !newPanels[activePanelId]) {
            newActivePanelId = Object.keys(newPanels)[0] || null
          }
        }
        
        updateActiveTab({
          layoutType: type,
          gridDimensions,
          panels: newPanels,
          activePanelId: newActivePanelId,
        })
      },
      
      setActivePanelId: (id: string | null) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        // Update the active panel ID
        updateActiveTab({ activePanelId: id })
        
        // Sync the new panel's selections to tab level so sidebar reflects them
        if (id && activeTab.panels[id]) {
          const panel = activeTab.panels[id]
          updateActiveTab({
            selectedRunIds: [...panel.selectedRunIds],
            selectedSegmentIds: [...panel.selectedSegmentIds],
          })
        }
      },
      
      updatePanelConfig: (panelId: string, config: Partial<PanelConfig>) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab || !activeTab.panels[panelId]) return
        
        updateActiveTab({
          panels: {
            ...activeTab.panels,
            [panelId]: {
              ...activeTab.panels[panelId],
              ...config,
            },
          },
        })
      },
      
      updatePanelChartConfig: (panelId: string, chartConfig: Partial<ChartConfig>) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab || !activeTab.panels[panelId]) return
        
        updateActiveTab({
          panels: {
            ...activeTab.panels,
            [panelId]: {
              ...activeTab.panels[panelId],
              chartConfig: {
                ...activeTab.panels[panelId].chartConfig,
                ...chartConfig,
              },
            },
          },
        })
      },
      
      setPanelSelectedRuns: (panelId: string, runIds: string[]) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab || !activeTab.panels[panelId]) return
        
        updateActiveTab({
          panels: {
            ...activeTab.panels,
            [panelId]: {
              ...activeTab.panels[panelId],
              selectedRunIds: runIds,
            },
          },
        })
      },
      
      togglePanelRunSelection: async (panelId: string, runId: string) => {
        const { getActiveTab, updateActiveTab, loadRunData } = get()
        const activeTab = getActiveTab()
        if (!activeTab || !activeTab.panels[panelId]) return
        
        const { panels, testSessions } = activeTab
        const panel = panels[panelId]
        const isSelected = panel.selectedRunIds.includes(runId) || 
          panel.selectedSegmentIds.some(id => id.startsWith(`${runId}:segment-`))
        
        if (isSelected) {
          // Deselect - remove both full run and any segments
          updateActiveTab({
            panels: {
              ...panels,
              [panelId]: {
                ...panel,
                selectedRunIds: panel.selectedRunIds.filter(id => id !== runId),
                selectedSegmentIds: panel.selectedSegmentIds.filter(id => !id.startsWith(`${runId}:segment-`)),
              },
            },
          })
        } else {
          // Check if data is already loaded
          const existingRun = getAllRuns(testSessions).find(r => r.id === runId)
          
          // If data already loaded and has multiple segments, select all segments
          if (existingRun?.segmentData && existingRun.segmentData.length > 1) {
            const segmentIds = existingRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
            const currentTab = getActiveTab()
            if (currentTab) {
              updateActiveTab({
                panels: {
                  ...currentTab.panels,
                  [panelId]: {
                    ...currentTab.panels[panelId],
                    selectedSegmentIds: [...new Set([...currentTab.panels[panelId].selectedSegmentIds, ...segmentIds])],
                  },
                },
              })
            }
            return
          }
          
          // If data already loaded with single/no segments, select as full run
          if (existingRun?.data && existingRun.data.length > 0) {
            const currentTab = getActiveTab()
            if (currentTab) {
              updateActiveTab({
                panels: {
                  ...currentTab.panels,
                  [panelId]: {
                    ...currentTab.panels[panelId],
                    selectedRunIds: [...currentTab.panels[panelId].selectedRunIds, runId],
                  },
                },
              })
            }
            return
          }
          
          // Data not loaded yet - load it first
          await loadRunData(runId)
          
          // Get updated run with segment data
          const updatedTab = getActiveTab()
          const updatedRun = getAllRuns(updatedTab?.testSessions || []).find(r => r.id === runId)
          
          // If it has multiple segments, select all segments
          if (updatedRun?.segmentData && updatedRun.segmentData.length > 1) {
            const segmentIds = updatedRun.segmentData.map((_, i) => `${runId}:segment-${i}`)
            const currentTab = getActiveTab()
            if (currentTab) {
              updateActiveTab({
                panels: {
                  ...currentTab.panels,
                  [panelId]: {
                    ...currentTab.panels[panelId],
                    selectedSegmentIds: [...new Set([...currentTab.panels[panelId].selectedSegmentIds, ...segmentIds])],
                  },
                },
              })
            }
          } else {
            // Single segment or no segments - select as full run
            const currentTab = getActiveTab()
            if (currentTab) {
              updateActiveTab({
                panels: {
                  ...currentTab.panels,
                  [panelId]: {
                    ...currentTab.panels[panelId],
                    selectedRunIds: [...currentTab.panels[panelId].selectedRunIds, runId],
                  },
                },
              })
            }
          }
        }
      },
      
      mergePanels: (panelIds: string[]) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab || panelIds.length < 2) return
        
        const { panels, activePanelId } = activeTab
        
        // Get all panels to merge
        const panelsToMerge = panelIds.map(id => panels[id]).filter(Boolean)
        if (panelsToMerge.length < 2) return
        
        // Get grid areas of all panels
        const gridAreas = panelsToMerge.map(p => p.gridArea).filter((g): g is GridArea => g !== undefined)
        if (gridAreas.length !== panelsToMerge.length) return
        
        // Check if they can be merged (form a valid rectangle)
        if (!canMergeGridAreas(gridAreas)) return
        
        // Merge the grid areas
        const mergedArea = mergeGridAreas(gridAreas)
        
        // Keep the first panel (by ID sort) as the merged panel, remove others
        const sortedPanelIds = panelIds.sort()
        const keepPanelId = sortedPanelIds[0]
        const removePanelIds = sortedPanelIds.slice(1)
        
        // Merge data from all panels into the kept panel
        const keepPanel = panels[keepPanelId]
        const allSelectedRunIds = new Set<string>()
        const allSelectedSegmentIds = new Set<string>()
        const allSelectedSliceCollectionIds = new Set<string>()
        
        for (const panel of panelsToMerge) {
          panel.selectedRunIds.forEach(id => allSelectedRunIds.add(id))
          panel.selectedSegmentIds.forEach(id => allSelectedSegmentIds.add(id))
          panel.selectedSliceCollectionIds.forEach(id => allSelectedSliceCollectionIds.add(id))
        }
        
        // Create new panels object without the removed panels
        const newPanels: Record<string, PanelConfig> = {}
        for (const [id, panel] of Object.entries(panels)) {
          if (removePanelIds.includes(id)) continue
          
          if (id === keepPanelId) {
            newPanels[id] = {
              ...keepPanel,
              gridArea: mergedArea,
              selectedRunIds: Array.from(allSelectedRunIds),
              selectedSegmentIds: Array.from(allSelectedSegmentIds),
              selectedSliceCollectionIds: Array.from(allSelectedSliceCollectionIds),
            }
          } else {
            newPanels[id] = panel
          }
        }
        
        // Adjust active panel if it was removed
        let newActivePanelId = activePanelId
        if (activePanelId && removePanelIds.includes(activePanelId)) {
          newActivePanelId = keepPanelId
        }
        
        updateActiveTab({
          layoutType: 'custom',  // Switch to custom layout when merging
          panels: newPanels,
          activePanelId: newActivePanelId,
        })
      },
      
      splitPanel: (panelId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab || !activeTab.panels[panelId]) return
        
        const { panels, gridDimensions } = activeTab
        const panel = panels[panelId]
        
        if (!panel.gridArea) return
        
        // Check if panel spans multiple cells
        const rowSpan = panel.gridArea.rowEnd - panel.gridArea.rowStart
        const colSpan = panel.gridArea.colEnd - panel.gridArea.colStart
        if (rowSpan <= 1 && colSpan <= 1) return  // Already a single cell
        
        // Split the panel into individual cells
        const splitAreas = splitGridArea(panel.gridArea)
        
        // Find the highest panel number to generate new IDs
        const existingPanelNums = Object.keys(panels).map(id => {
          const match = id.match(/^panel-(\d+)$/)
          return match ? parseInt(match[1], 10) : 0
        })
        let nextPanelNum = Math.max(...existingPanelNums, 0) + 1
        
        // Create new panels for each cell
        const newPanels: Record<string, PanelConfig> = {}
        
        // Copy all other panels
        for (const [id, p] of Object.entries(panels)) {
          if (id !== panelId) {
            newPanels[id] = p
          }
        }
        
        // Create split panels
        let firstNewPanelId: string | null = null
        for (let i = 0; i < splitAreas.length; i++) {
          const newPanelId = i === 0 ? panelId : `panel-${nextPanelNum++}`
          if (i === 0) firstNewPanelId = newPanelId
          
          newPanels[newPanelId] = {
            id: newPanelId,
            name: i === 0 ? panel.name : `View ${nextPanelNum - 1}`,
            selectedRunIds: i === 0 ? panel.selectedRunIds : [],
            selectedSegmentIds: i === 0 ? panel.selectedSegmentIds : [],
            selectedSliceIds: i === 0 ? (panel.selectedSliceIds ?? []) : [],
            selectedSliceCollectionIds: i === 0 ? panel.selectedSliceCollectionIds : [],
            chartConfig: { ...panel.chartConfig },
            gridArea: splitAreas[i],
          }
        }
        
        updateActiveTab({
          layoutType: 'custom',  // Switch to custom layout when splitting
          gridDimensions,  // Keep same grid dimensions
          panels: newPanels,
          activePanelId: firstNewPanelId,
        })
      },
      
      saveViewPreset: (name: string, type: 'layout' | 'panel') => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { layoutType, gridDimensions, panels, activePanelId, viewPresets } = activeTab
        const presetId = `preset-${Date.now()}`
        
        let newPreset: ViewPreset
        
        if (type === 'layout') {
          newPreset = {
            id: presetId,
            name,
            createdAt: Date.now(),
            type: 'layout',
            layoutType,
            gridDimensions,
            panels: Object.values(panels),
          }
        } else {
          // Panel preset - save the active panel's config
          if (!activePanelId || !panels[activePanelId]) return
          
          const activePanel = panels[activePanelId]
          newPreset = {
            id: presetId,
            name,
            createdAt: Date.now(),
            type: 'panel',
            panelConfig: {
              name: activePanel.name,
              selectedRunIds: activePanel.selectedRunIds,
              selectedSegmentIds: activePanel.selectedSegmentIds,
              selectedSliceIds: activePanel.selectedSliceIds ?? [],
              selectedSliceCollectionIds: activePanel.selectedSliceCollectionIds ?? [],
              chartConfig: activePanel.chartConfig,
            },
          }
        }
        
        updateActiveTab({
          viewPresets: [...viewPresets, newPreset],
        })
      },
      
      loadViewPreset: (presetId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const { viewPresets, activePanelId, panels } = activeTab
        const preset = viewPresets.find(p => p.id === presetId)
        if (!preset) return
        
        if (preset.type === 'layout' && preset.layoutType && preset.panels) {
          // Load layout preset - restore entire layout
          const newPanels: Record<string, PanelConfig> = {}
          preset.panels.forEach(panel => {
            newPanels[panel.id] = { ...panel }
          })
          
          updateActiveTab({
            layoutType: preset.layoutType,
            gridDimensions: preset.gridDimensions || getGridDimensionsForLayout(preset.layoutType),
            panels: newPanels,
            activePanelId: Object.keys(newPanels)[0] || null,
          })
        } else if (preset.type === 'panel' && preset.panelConfig && activePanelId) {
          // Load panel preset - apply to active panel
          const currentPanel = panels[activePanelId]
          if (!currentPanel) return
          
          updateActiveTab({
            panels: {
              ...panels,
              [activePanelId]: {
                ...currentPanel,
                name: preset.panelConfig.name,
                selectedRunIds: preset.panelConfig.selectedRunIds,
                selectedSegmentIds: preset.panelConfig.selectedSegmentIds,
                chartConfig: preset.panelConfig.chartConfig,
              },
            },
          })
        }
      },
      
      deleteViewPreset: (presetId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        updateActiveTab({
          viewPresets: activeTab.viewPresets.filter(p => p.id !== presetId),
        })
      },
      
      // ============ SLICE ACTIONS ============
      createSliceAtPosition: (xValue: number, xColumn: DataColumn, points: SlicePoint[], collectionId?: string | null) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return ''
        
        const sliceCollections = activeTab.sliceCollections ?? []
        
        const sliceId = `slice-${Date.now()}`
        const slice: Slice = {
          id: sliceId,
          name: `Slice @ ${xValue.toFixed(2)}${COLUMN_UNITS[xColumn] || ''}`,
          xValue,
          xColumn,
          createdAt: Date.now(),
          points,
        }
        
        if (collectionId) {
          // Add to existing collection
          const collection = sliceCollections.find(c => c.id === collectionId)
          if (collection) {
            // Insert slice in order by xValue
            const updatedSlices = [...collection.slices, slice].sort((a, b) => a.xValue - b.xValue)
            updateActiveTab({
              sliceCollections: sliceCollections.map(c =>
                c.id === collectionId ? { ...c, slices: updatedSlices } : c
              ),
            })
          }
        } else {
          // Create new collection with this slice
          const newCollectionId = `collection-${Date.now()}`
          const newCollection: SliceCollection = {
            id: newCollectionId,
            name: `Slice Collection ${sliceCollections.length + 1}`,
            slices: [slice],
            createdAt: Date.now(),
          }
          updateActiveTab({
            sliceCollections: [...sliceCollections, newCollection],
          })
        }
        
        return sliceId
      },
      
      createSliceFromSelection: (xColumn: DataColumn, xValue: number, segmentIds: string[], collectionId?: string | null) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return ''
        
        const testSessions = activeTab.testSessions ?? []
        const sliceCollections = activeTab.sliceCollections ?? []
        
        // All available data columns
        const ALL_COLUMNS: DataColumn[] = ['time', 'pwm', 'loadCell', 'thrust', 'voltage', 'current', 'rpm', 'efficiency']
        
        // Helper: Get full ThrusterDataPoint[] data for a segment or run by ID
        const getFullDataForId = (id: string): ThrusterDataPoint[] => {
          const isSegment = id.includes(':segment-')
          
          for (const session of testSessions) {
            for (const run of session.runs) {
              if (isSegment) {
                const [runId, segmentPart] = id.split(':segment-')
                if (run.id === runId && run.segmentData) {
                  const segmentIndex = parseInt(segmentPart, 10)
                  if (run.segmentData[segmentIndex]) {
                    return run.segmentData[segmentIndex].data
                  }
                }
              } else {
                if (run.id === id) {
                  return run.data
                }
              }
            }
          }
          return []
        }
        
        // Helper: Interpolate a column value at a specific X position
        const interpolateColumnAtX = (
          dataPoints: ThrusterDataPoint[],
          targetX: number,
          xCol: DataColumn,
          valueColumn: DataColumn
        ): number | null => {
          if (dataPoints.length === 0) return null
          
          let lowIdx = -1
          let highIdx = -1
          
          for (let i = 0; i < dataPoints.length; i++) {
            const x = dataPoints[i][xCol] as number
            if (x <= targetX) {
              lowIdx = i
            }
            if (x >= targetX && highIdx === -1) {
              highIdx = i
            }
          }
          
          if (lowIdx === -1) return dataPoints[0][valueColumn] as number
          if (highIdx === -1) return dataPoints[dataPoints.length - 1][valueColumn] as number
          if (lowIdx === highIdx) return dataPoints[lowIdx][valueColumn] as number
          
          const lowPoint = dataPoints[lowIdx]
          const highPoint = dataPoints[highIdx]
          const lowX = lowPoint[xCol] as number
          const highX = highPoint[xCol] as number
          const lowVal = lowPoint[valueColumn] as number
          const highVal = highPoint[valueColumn] as number
          
          if (highX === lowX) return lowVal
          
          const ratio = (targetX - lowX) / (highX - lowX)
          return lowVal + ratio * (highVal - lowVal)
        }
        
        // Helper: Get segment/run name and color
        const getSegmentInfo = (id: string): { name: string; color: string } => {
          const isSegment = id.includes(':segment-')
          
          for (const session of testSessions) {
            for (const run of session.runs) {
              if (isSegment) {
                const [runId, segmentPart] = id.split(':segment-')
                if (run.id === runId) {
                  const segmentIndex = parseInt(segmentPart, 10)
                  const color = getSegmentColor(runId, segmentIndex, testSessions)
                  return { name: `${run.name} - Seg ${segmentIndex + 1}`, color }
                }
              } else {
                if (run.id === id) {
                  const color = getColorForRun(id, testSessions)
                  return { name: run.name, color }
                }
              }
            }
          }
          return { name: id, color: RUN_COLORS[0] }
        }
        
        // Build slice points with ALL column data
        const points: SlicePoint[] = []
        
        for (const segmentId of segmentIds) {
          const fullData = getFullDataForId(segmentId)
          if (fullData.length === 0) continue
          
          const { name, color } = getSegmentInfo(segmentId)
          
          // Interpolate ALL columns at this X position
          const values: Partial<Record<DataColumn, number>> = {}
          ALL_COLUMNS.forEach(col => {
            const interpolatedValue = interpolateColumnAtX(fullData, xValue, xColumn, col)
            if (interpolatedValue !== null) {
              values[col] = interpolatedValue
            }
          })
          
          points.push({
            segmentId,
            segmentName: name,
            color,
            values,
          })
        }
        
        if (points.length === 0) return ''
        
        // Create the slice
        const sliceId = `slice-${Date.now()}`
        const slice: Slice = {
          id: sliceId,
          name: `Slice @ ${xValue.toFixed(2)}${COLUMN_UNITS[xColumn] || ''}`,
          xValue,
          xColumn,
          createdAt: Date.now(),
          points,
        }
        
        if (collectionId) {
          // Add to existing collection
          const collection = sliceCollections.find(c => c.id === collectionId)
          if (collection) {
            const updatedSlices = [...collection.slices, slice].sort((a, b) => a.xValue - b.xValue)
            updateActiveTab({
              sliceCollections: sliceCollections.map(c =>
                c.id === collectionId ? { ...c, slices: updatedSlices } : c
              ),
            })
          }
        } else {
          // Create new collection with this slice
          const newCollectionId = `collection-${Date.now()}`
          const newCollection: SliceCollection = {
            id: newCollectionId,
            name: `Slice Collection ${sliceCollections.length + 1}`,
            slices: [slice],
            createdAt: Date.now(),
          }
          updateActiveTab({
            sliceCollections: [...sliceCollections, newCollection],
          })
        }
        
        return sliceId
      },
      
      createSliceCollection: (name: string, initialSlice?: Slice) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return ''
        
        const sliceCollections = activeTab.sliceCollections ?? []
        
        const collectionId = `collection-${Date.now()}`
        const newCollection: SliceCollection = {
          id: collectionId,
          name,
          slices: initialSlice ? [initialSlice] : [],
          createdAt: Date.now(),
        }
        
        updateActiveTab({
          sliceCollections: [...sliceCollections, newCollection],
        })
        
        return collectionId
      },
      
      addSliceToCollection: (collectionId: string, slice: Slice) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const sliceCollections = activeTab.sliceCollections ?? []
        
        updateActiveTab({
          sliceCollections: sliceCollections.map(c => {
            if (c.id !== collectionId) return c
            // Insert slice in order by xValue
            const updatedSlices = [...c.slices, slice].sort((a, b) => a.xValue - b.xValue)
            return { ...c, slices: updatedSlices }
          }),
        })
      },
      
      removeSliceFromCollection: (collectionId: string, sliceId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const sliceCollections = activeTab.sliceCollections ?? []
        
        updateActiveTab({
          sliceCollections: sliceCollections.map(c => {
            if (c.id !== collectionId) return c
            return { ...c, slices: c.slices.filter(s => s.id !== sliceId) }
          }),
        })
      },
      
      deleteSliceCollection: (collectionId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const sliceCollections = activeTab.sliceCollections ?? []
        const selectedSliceCollectionIds = activeTab.selectedSliceCollectionIds ?? []
        
        updateActiveTab({
          sliceCollections: sliceCollections.filter(c => c.id !== collectionId),
          selectedSliceCollectionIds: selectedSliceCollectionIds.filter(id => id !== collectionId),
        })
      },
      
      renameSliceCollection: (collectionId: string, name: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const sliceCollections = activeTab.sliceCollections ?? []
        
        updateActiveTab({
          sliceCollections: sliceCollections.map(c =>
            c.id === collectionId ? { ...c, name } : c
          ),
        })
      },
      
      renameSlice: (sliceId: string, name: string, collectionId?: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        if (collectionId) {
          // Rename in collection
          const sliceCollections = activeTab.sliceCollections ?? []
          updateActiveTab({
            sliceCollections: sliceCollections.map(c => {
              if (c.id !== collectionId) return c
              return {
                ...c,
                slices: c.slices.map(s => s.id === sliceId ? { ...s, name } : s),
              }
            }),
          })
        } else {
          // Rename standalone slice
          const slices = activeTab.slices ?? []
          updateActiveTab({
            slices: slices.map(s => s.id === sliceId ? { ...s, name } : s),
          })
        }
      },
      
      toggleSliceCollectionSelection: (collectionId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        const selectedSliceCollectionIds = activeTab.selectedSliceCollectionIds ?? []
        
        const isSelected = selectedSliceCollectionIds.includes(collectionId)
        updateActiveTab({
          selectedSliceCollectionIds: isSelected
            ? selectedSliceCollectionIds.filter(id => id !== collectionId)
            : [...selectedSliceCollectionIds, collectionId],
        })
      },
      
      togglePanelSliceCollectionSelection: (panelId: string, collectionId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab || !activeTab.panels[panelId]) return
        
        const panel = activeTab.panels[panelId]
        const selectedSliceCollectionIds = panel.selectedSliceCollectionIds ?? []
        
        const isSelected = selectedSliceCollectionIds.includes(collectionId)
        updateActiveTab({
          panels: {
            ...activeTab.panels,
            [panelId]: {
              ...panel,
              selectedSliceCollectionIds: isSelected
                ? selectedSliceCollectionIds.filter(id => id !== collectionId)
                : [...selectedSliceCollectionIds, collectionId],
            },
          },
        })
      },
      
      togglePanelSliceSelection: (panelId: string, sliceId: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab || !activeTab.panels[panelId]) return
        
        const panel = activeTab.panels[panelId]
        const selectedSliceIds = panel.selectedSliceIds ?? []
        
        const isSelected = selectedSliceIds.includes(sliceId)
        updateActiveTab({
          panels: {
            ...activeTab.panels,
            [panelId]: {
              ...panel,
              selectedSliceIds: isSelected
                ? selectedSliceIds.filter(id => id !== sliceId)
                : [...selectedSliceIds, sliceId],
            },
          },
        })
      },
      
      createStandaloneSlice: (sliceData: Omit<Slice, 'id' | 'createdAt'>) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return ''
        
        const sliceId = `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const slice: Slice = {
          ...sliceData,
          id: sliceId,
          createdAt: Date.now(),
        }
        
        const slices = activeTab.slices ?? []
        updateActiveTab({
          slices: [...slices, slice],
        })
        
        return sliceId
      },
      
      deleteSlice: (sliceId: string, collectionId?: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        if (collectionId) {
          // Delete from collection
          const sliceCollections = activeTab.sliceCollections ?? []
          updateActiveTab({
            sliceCollections: sliceCollections.map(c => 
              c.id === collectionId
                ? { ...c, slices: c.slices.filter(s => s.id !== sliceId) }
                : c
            ),
          })
        } else {
          // Delete standalone slice
          const slices = activeTab.slices ?? []
          updateActiveTab({
            slices: slices.filter(s => s.id !== sliceId),
          })
        }
        
        // Also remove from all panel selections
        const newPanels: Record<string, PanelConfig> = {}
        for (const [id, panel] of Object.entries(activeTab.panels)) {
          newPanels[id] = {
            ...panel,
            selectedSliceIds: (panel.selectedSliceIds ?? []).filter(id => id !== sliceId),
          }
        }
        updateActiveTab({ panels: newPanels })
      },
      
      updateSliceColor: (sliceId: string, color: string, collectionId?: string) => {
        const { getActiveTab, updateActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return
        
        if (collectionId) {
          // Update in collection
          const sliceCollections = activeTab.sliceCollections ?? []
          updateActiveTab({
            sliceCollections: sliceCollections.map(c => 
              c.id === collectionId
                ? { 
                    ...c, 
                    slices: c.slices.map(s => 
                      s.id === sliceId ? { ...s, color } : s
                    ) 
                  }
                : c
            ),
          })
        } else {
          // Update standalone slice
          const slices = activeTab.slices ?? []
          updateActiveTab({
            slices: slices.map(s => s.id === sliceId ? { ...s, color } : s),
          })
        }
      },
      
      // ============ GETTERS ============
      getSelectedRuns: () => {
        const { getActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return []
        
        const { testSessions, selectedRunIds } = activeTab
        const allRuns = getAllRuns(testSessions)
        return allRuns.filter(r => selectedRunIds.includes(r.id))
      },
      
      getRunById: (runId: string) => {
        const { getActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return null
        
        const allRuns = getAllRuns(activeTab.testSessions)
        return allRuns.find(r => r.id === runId) || null
      },
      
      getRunColor: (runId: string) => {
        const { getActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) return RUN_COLORS[0]
        
        const { chartConfig, testSessions } = activeTab
        const seriesConfig = chartConfig.seriesConfigs[runId]
        if (seriesConfig) return seriesConfig.color
        return getColorForRun(runId, testSessions)
      },
      
      getSeriesConfig: (runId: string) => {
        const { getActiveTab } = get()
        const activeTab = getActiveTab()
        if (!activeTab) {
          return {
            ...DEFAULT_SERIES_CONFIG,
            runId,
            color: RUN_COLORS[0],
          }
        }
        
        const { chartConfig, testSessions } = activeTab
        const existing = chartConfig.seriesConfigs[runId]
        if (existing) return existing
        // Return default config if not found
        return {
          ...DEFAULT_SERIES_CONFIG,
          runId,
          color: getColorForRun(runId, testSessions),
        }
      },
    }},
    {
      name: 'thruster-viewer-storage',
      partialize: (state) => ({
        // Persist tabs (each tab contains its own workspace state)
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        // Persist global UI preferences
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        activeView: state.activeView,
        inspectorPanelHeight: state.inspectorPanelHeight,
        // Persist last workspace for auto-load
        lastWorkspacePath: state.lastWorkspacePath,
        // Persist autosave preference
        autosaveEnabled: state.autosaveEnabled,
      }),
    }
  )
)

// ============================================================================
// Autosave Subscription
// ============================================================================

// Debounce timeout for autosave (2 seconds after last change)
const AUTOSAVE_DELAY = 2000
let autosaveTimeoutId: ReturnType<typeof setTimeout> | null = null

// Track the last saved state snapshot to avoid unnecessary saves
let lastSavedStateSnapshot: string | null = null

/**
 * Create a simple snapshot of the relevant state for comparison
 * This helps avoid saving when nothing meaningful has changed
 */
function createStateSnapshot(state: AppState): string {
  const activeTab = state.getActiveTab()
  if (!activeTab) return ''
  
  // Only include fields that should trigger autosave
  return JSON.stringify({
    chartConfig: activeTab.chartConfig,
    panels: activeTab.panels,
    selectedRunIds: activeTab.selectedRunIds,
    selectedSegmentIds: activeTab.selectedSegmentIds,
    layoutType: activeTab.layoutType,
    activePanelId: activeTab.activePanelId,
    sliceCollections: activeTab.sliceCollections,
    selectedSliceCollectionIds: activeTab.selectedSliceCollectionIds,
    viewPresets: activeTab.viewPresets,
    // UI state
    sidebarVisible: state.sidebarVisible,
    sidebarWidth: state.sidebarWidth,
    activeView: state.activeView,
    inspectorPanelHeight: state.inspectorPanelHeight,
  })
}

// Subscribe to store changes and trigger debounced autosave
useAppStore.subscribe((state, _prevState) => {
  const activeTab = state.getActiveTab()
  
  // Only autosave if:
  // 1. Autosave is enabled
  // 2. Workspace has been saved at least once (has a path)
  // 3. Not currently in the middle of a save
  if (!state.autosaveEnabled || !activeTab?.workspacePath || state.isSaving) {
    return
  }
  
  // Create a snapshot of the current state
  const currentSnapshot = createStateSnapshot(state)
  
  // Skip if state hasn't changed meaningfully
  if (currentSnapshot === lastSavedStateSnapshot) {
    return
  }
  
  // Clear any pending autosave
  if (autosaveTimeoutId) {
    clearTimeout(autosaveTimeoutId)
  }
  
  // Schedule a new autosave
  autosaveTimeoutId = setTimeout(() => {
    const currentState = useAppStore.getState()
    const tab = currentState.getActiveTab()
    
    // Double-check conditions before saving
    if (currentState.autosaveEnabled && tab?.workspacePath && !currentState.isSaving) {
      currentState.saveWorkspace().then((success) => {
        if (success) {
          // Update the snapshot after successful save
          lastSavedStateSnapshot = createStateSnapshot(currentState)
        }
      })
    }
    autosaveTimeoutId = null
  }, AUTOSAVE_DELAY)
})

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook to get the active workspace tab
 */
export function useActiveTab(): WorkspaceTab | null {
  const { tabs, activeTabId } = useAppStore()
  return tabs.find(t => t.id === activeTabId) || null
}

/**
 * Get color for a segment
 */
function getSegmentColor(runId: string, segmentIndex: number, sessions: TestSession[]): string {
  const allRuns = getAllRuns(sessions)
  const runIndex = allRuns.findIndex(r => r.id === runId)
  // Offset segment colors from the run's base color
  const colorIndex = runIndex * 10 + segmentIndex
  return RUN_COLORS[colorIndex % RUN_COLORS.length]
}

/**
 * Get formatted sessions for the DataSeriesView component
 */
export function useTestBrowserSessions() {
  const { getActiveTab, getRunColor } = useAppStore()
  const activeTab = getActiveTab()
  
  if (!activeTab) return []
  
  const { testSessions, selectedRunIds, selectedSegmentIds } = activeTab
  
  return testSessions.map(session => ({
    id: session.id,
    name: session.name,
    runs: session.runs.map(run => {
      // Build segment info if the run has multiple segments
      const segmentInfo = run.segmentData && run.segmentData.length > 1
        ? run.segmentData.map((seg, i) => ({
            id: `${run.id}:segment-${i}`,
            index: i,
            rowCount: seg.rowCount,
            selected: selectedSegmentIds.includes(`${run.id}:segment-${i}`),
            color: getSegmentColor(run.id, i, testSessions),
          }))
        : undefined
      
      return {
        id: run.id,
        name: run.name,
        filePath: run.filePath,
        selected: selectedRunIds.includes(run.id),
        color: getRunColor(run.id),
        segments: run.segments,
        segmentInfo,
      }
    }),
  }))
}

/**
 * Get formatted run data for the ChartPanel component
 * Handles both full run selections AND individual segment selections
 */
export function useChartData() {
  const { getSelectedRuns, getActiveTab, getSeriesConfig } = useAppStore()
  const activeTab = getActiveTab()
  const selectedRuns = getSelectedRuns()
  
  if (!activeTab) return []
  
  const { testSessions, selectedSegmentIds, chartConfig } = activeTab
  const xColumn = chartConfig.xAxis.column
  const yColumn = chartConfig.yAxis.column
  
  const result: Array<{
    id: string
    name: string
    color: string
    seriesConfig: SeriesConfig
    data: Array<{ x: number; y: number }>
  }> = []
  
  // Add full-run selections
  selectedRuns
    .filter(run => run.data.length > 0)
    .forEach(run => {
      const seriesConfig = getSeriesConfig(run.id)
      const mappedData = run.data.map(point => ({
        x: point[xColumn] as number,
        y: point[yColumn] as number,
      }))
      
      result.push({
        id: run.id,
        name: run.name,
        color: seriesConfig.color,
        seriesConfig,
        data: mappedData,
      })
    })
  
  // Add individual segment selections
  const allRuns = getAllRuns(testSessions)
  
  for (const segmentId of selectedSegmentIds) {
    const [runId, segmentPart] = segmentId.split(':segment-')
    const segmentIndex = parseInt(segmentPart, 10)
    
    const run = allRuns.find(r => r.id === runId)
    if (!run?.segmentData?.[segmentIndex]) continue
    
    const segmentData = run.segmentData[segmentIndex]
    const seriesConfig = getSeriesConfig(segmentId) // Use segment ID for config
    const segmentColor = getSegmentColor(runId, segmentIndex, testSessions)
    
    const mappedData = segmentData.data.map(point => ({
      x: point[xColumn] as number,
      y: point[yColumn] as number,
    }))
    
    result.push({
      id: segmentId,
      name: `${run.name} - Seg ${segmentIndex + 1}`,
      color: segmentColor,
      seriesConfig: { ...seriesConfig, color: segmentColor },
      data: mappedData,
    })
  }
  
  // Add selected slices (individual slice selection)
  const sliceCollections = activeTab.sliceCollections ?? []
  const standaloneSlices = activeTab.slices ?? []
  const activePanel = activeTab.activePanelId ? activeTab.panels[activeTab.activePanelId] : null
  const selectedSliceIds = activePanel?.selectedSliceIds ?? []
  
  // Helper to find a slice by ID
  const findSliceForChart = (sliceId: string): { slice: Slice | undefined; collectionName?: string } => {
    const standalone = standaloneSlices.find(s => s.id === sliceId)
    if (standalone) return { slice: standalone }
    
    for (const collection of sliceCollections) {
      const slice = collection.slices.find(s => s.id === sliceId)
      if (slice) return { slice, collectionName: collection.name }
    }
    
    return { slice: undefined }
  }
  
  for (const sliceId of selectedSliceIds) {
    const { slice, collectionName } = findSliceForChart(sliceId)
    if (!slice) continue
    
    const dataPoints: Array<{ x: number; y: number }> = []
    
    for (const point of slice.points) {
      const xValue = point.values[xColumn]
      const yValue = point.values[yColumn]
      if (xValue !== undefined && yValue !== undefined) {
        dataPoints.push({
          x: xValue,
          y: yValue,
        })
      }
    }
    
    if (dataPoints.length > 0) {
      dataPoints.sort((a, b) => a.x - b.x)
      
      const sliceSeriesConfig = getSeriesConfig(sliceId)
      const sliceColor = slice.color || slice.points[0]?.color || sliceSeriesConfig.color
      
      result.push({
        id: `slice-${sliceId}`,
        name: collectionName ? `${slice.name} (${collectionName})` : slice.name,
        color: sliceColor,
        seriesConfig: { ...sliceSeriesConfig, color: sliceColor },
        data: dataPoints,
      })
    }
  }
  
  return result
}

/**
 * Get secondary Y-axis data when enabled
 */
export function useChartDataY2() {
  const { getSelectedRuns, getActiveTab, getSeriesConfig } = useAppStore()
  const activeTab = getActiveTab()
  const selectedRuns = getSelectedRuns()
  
  if (!activeTab) return []
  
  const { chartConfig } = activeTab
  if (!chartConfig.y2Axis.enabled) return []
  
  const xColumn = chartConfig.xAxis.column
  const y2Column = chartConfig.y2Axis.column
  
  return selectedRuns
    .filter(run => {
      const seriesConfig = getSeriesConfig(run.id)
      return run.data.length > 0 && seriesConfig.yAxisId === 'y2'
    })
    .map(run => {
      const seriesConfig = getSeriesConfig(run.id)
      return {
        id: run.id,
        name: run.name,
        color: seriesConfig.color,
        seriesConfig,
        data: run.data.map(point => ({
          x: point[xColumn] as number,
          y: point[y2Column] as number,
        })),
      }
    })
}

/**
 * Get summary stats for selected runs
 */
export function useSelectedRunsStats() {
  const { getSelectedRuns, getActiveTab } = useAppStore()
  const activeTab = getActiveTab()
  const selectedRuns = getSelectedRuns()
  
  if (!activeTab) return null
  
  const { chartConfig } = activeTab
  const yColumn = chartConfig.yAxis.column
  
  const loadedRuns = selectedRuns.filter(r => r.data.length > 0)
  
  if (loadedRuns.length === 0) {
    return null
  }
  
  const allValues = loadedRuns.flatMap(r => r.data.map(p => p[yColumn] as number))
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length
  
  return {
    runCount: selectedRuns.length,
    loadedCount: loadedRuns.length,
    totalPoints: allValues.length,
    min,
    max,
    avg,
  }
}

/**
 * Get chart data for a specific panel
 * Returns the chart data based on the panel's selections and chart config
 */
export function usePanelChartData(panelId: string) {
  const { getActiveTab, getSeriesConfig } = useAppStore()
  const activeTab = getActiveTab()
  
  if (!activeTab) return []
  
  const { panels, testSessions } = activeTab
  const panel = panels[panelId]
  
  if (!panel) return []
  
  const xColumn = panel.chartConfig.xAxis.column
  const yColumn = panel.chartConfig.yAxis.column
  
  const result: Array<{
    id: string
    name: string
    color: string
    seriesConfig: SeriesConfig
    data: Array<{ x: number; y: number }>
  }> = []
  
  const allRuns = getAllRuns(testSessions)
  
  // Add full-run selections
  for (const runId of panel.selectedRunIds) {
    const run = allRuns.find(r => r.id === runId)
    if (!run || run.data.length === 0) continue
    
    const seriesConfig = getSeriesConfig(runId)
    const mappedData = run.data.map(point => ({
      x: point[xColumn] as number,
      y: point[yColumn] as number,
    }))
    
    result.push({
      id: run.id,
      name: run.name,
      color: seriesConfig.color,
      seriesConfig,
      data: mappedData,
    })
  }
  
  // Add individual segment selections
  for (const segmentId of panel.selectedSegmentIds) {
    const [runId, segmentPart] = segmentId.split(':segment-')
    const segmentIndex = parseInt(segmentPart, 10)
    
    const run = allRuns.find(r => r.id === runId)
    if (!run?.segmentData?.[segmentIndex]) continue
    
    const segmentData = run.segmentData[segmentIndex]
    const seriesConfig = getSeriesConfig(segmentId)
    const segmentColor = getSegmentColor(runId, segmentIndex, testSessions)
    
    const mappedData = segmentData.data.map(point => ({
      x: point[xColumn] as number,
      y: point[yColumn] as number,
    }))
    
    result.push({
      id: segmentId,
      name: `${run.name} - Seg ${segmentIndex + 1}`,
      color: segmentColor,
      seriesConfig: { ...seriesConfig, color: segmentColor },
      data: mappedData,
    })
  }
  
  // Add selected slices (individual slice selection per panel)
  // Each slice becomes ONE series, with each segment in that slice as a data point
  const sliceCollections = activeTab.sliceCollections ?? []
  const standaloneSlices = activeTab.slices ?? []
  const panelSelectedSliceIds = panel.selectedSliceIds ?? []
  
  // Helper to find a slice by ID (from either collections or standalone)
  const findSlice = (sliceId: string): { slice: Slice | undefined; collectionName?: string } => {
    // Check standalone slices first
    const standalone = standaloneSlices.find(s => s.id === sliceId)
    if (standalone) return { slice: standalone }
    
    // Check collections
    for (const collection of sliceCollections) {
      const slice = collection.slices.find(s => s.id === sliceId)
      if (slice) return { slice, collectionName: collection.name }
    }
    
    return { slice: undefined }
  }
  
  for (const sliceId of panelSelectedSliceIds) {
    const { slice, collectionName } = findSlice(sliceId)
    if (!slice) continue
    
    const dataPoints: Array<{ x: number; y: number }> = []
    
    for (const point of slice.points) {
      // Use the chart's configured X and Y columns from the slice point's values
      const xValue = point.values[xColumn]
      const yValue = point.values[yColumn]
      if (xValue !== undefined && yValue !== undefined) {
        dataPoints.push({
          x: xValue,
          y: yValue,
        })
      }
    }
    
    if (dataPoints.length > 0) {
      // Sort by x value for proper line rendering
      dataPoints.sort((a, b) => a.x - b.x)
      
      // Use slice's default series config
      const seriesConfig = getSeriesConfig(sliceId)
      
      // Pick a color - use slice's custom color, first point's color, or fall back to series config
      const sliceColor = slice.color || slice.points[0]?.color || seriesConfig.color
      
      result.push({
        id: `slice-${sliceId}`,
        name: collectionName ? `${slice.name} (${collectionName})` : slice.name,
        color: sliceColor,
        seriesConfig: { ...seriesConfig, color: sliceColor },
        data: dataPoints,
      })
    }
  }
  
  return result
}

/**
 * Get chart data for a slice collection
 * Transforms a SliceCollection into chartable data where:
 * - Each original segment becomes a series
 * - Each slice becomes a data point using configured X and Y columns
 */
export function useSliceChartData(collectionId: string, xColumn: DataColumn = 'time', yColumn: DataColumn = 'thrust') {
  const { getActiveTab, getSeriesConfig } = useAppStore()
  const activeTab = getActiveTab()
  
  if (!activeTab) return []
  
  const sliceCollections = activeTab.sliceCollections ?? []
  const collection = sliceCollections.find(c => c.id === collectionId)
  if (!collection || collection.slices.length === 0) return []
  
  const result: Array<{
    id: string
    name: string
    color: string
    seriesConfig: SeriesConfig
    data: Array<{ x: number; y: number }>
  }> = []
  
  // For each slice, create a series where each segment point becomes a data point
  for (const slice of collection.slices) {
    const dataPoints: Array<{ x: number; y: number }> = []
    
    for (const point of slice.points) {
      // Use the configured X and Y columns from the slice point's values
      const xValue = point.values[xColumn]
      const yValue = point.values[yColumn]
      if (xValue !== undefined && yValue !== undefined) {
        dataPoints.push({
          x: xValue,
          y: yValue,
        })
      }
    }
    
    // Only add if we have data points
    if (dataPoints.length > 0) {
      // Sort by x value for proper line rendering
      dataPoints.sort((a, b) => a.x - b.x)
      
      const seriesConfig = getSeriesConfig(collectionId)
      const sliceColor = slice.points[0]?.color || seriesConfig.color
      
      result.push({
        id: `slice-${collectionId}-${slice.id}`,
        name: `${slice.name} (${collection.name})`,
        color: sliceColor,
        seriesConfig: { ...seriesConfig, color: sliceColor },
        data: dataPoints,
      })
    }
  }
  
  return result
}

/**
 * Get chart data for all selected slice collections
 * Combines data from all selected collections into chartable format
 * Uses active panel's selections if available, else tab-level for backward compat
 */
export function useSelectedSlicesChartData(xColumn: DataColumn = 'time', yColumn: DataColumn = 'thrust') {
  const { getActiveTab, getSeriesConfig } = useAppStore()
  const activeTab = getActiveTab()
  
  if (!activeTab) return []
  
  const sliceCollections = activeTab.sliceCollections ?? []
  const standaloneSlices = activeTab.slices ?? []
  const activePanel = activeTab.activePanelId ? activeTab.panels[activeTab.activePanelId] : null
  const selectedSliceIds = activePanel?.selectedSliceIds ?? []
  
  const result: Array<{
    id: string
    name: string
    color: string
    seriesConfig: SeriesConfig
    data: Array<{ x: number; y: number }>
  }> = []
  
  // Helper to find a slice by ID
  const findSliceById = (sliceId: string): { slice: Slice | undefined; collectionName?: string } => {
    const standalone = standaloneSlices.find(s => s.id === sliceId)
    if (standalone) return { slice: standalone }
    
    for (const collection of sliceCollections) {
      const slice = collection.slices.find(s => s.id === sliceId)
      if (slice) return { slice, collectionName: collection.name }
    }
    
    return { slice: undefined }
  }
  
  for (const sliceId of selectedSliceIds) {
    const { slice, collectionName } = findSliceById(sliceId)
    if (!slice) continue
    
    const dataPoints: Array<{ x: number; y: number }> = []
    
    for (const point of slice.points) {
      const xValue = point.values[xColumn]
      const yValue = point.values[yColumn]
      if (xValue !== undefined && yValue !== undefined) {
        dataPoints.push({
          x: xValue,
          y: yValue,
        })
      }
    }
    
    if (dataPoints.length > 0) {
      dataPoints.sort((a, b) => a.x - b.x)
      
      const seriesConfig = getSeriesConfig(sliceId)
      const sliceColor = slice.color || slice.points[0]?.color || seriesConfig.color
      
      result.push({
        id: `slice-${sliceId}`,
        name: collectionName ? `${slice.name} (${collectionName})` : slice.name,
        color: sliceColor,
        seriesConfig: { ...seriesConfig, color: sliceColor },
        data: dataPoints,
      })
    }
  }
  
  return result
}

/**
 * Get the currently active panel's configuration
 * Returns null if no panel is active
 */
export function useActivePanelConfig(): PanelConfig | null {
  const { getActiveTab } = useAppStore()
  const activeTab = getActiveTab()
  
  if (!activeTab || !activeTab.activePanelId) return null
  return activeTab.panels[activeTab.activePanelId] || null
}

// Legacy compatibility export
export const Y_AXIS_LABELS = COLUMN_LABELS
export type YAxisMetric = DataColumn
