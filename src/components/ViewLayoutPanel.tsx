import { useAppStore, usePanelChartData, useActiveTab, type GridArea } from '../stores/appStore'
import { ChartPanel } from './ChartPanel'

/**
 * ViewLayoutPanel - Multi-panel grid container component
 * 
 * Renders a configurable grid of ChartPanel instances based on the layout type.
 * Supports single, horizontal-2, vertical-2, quad, grid-3x3, grid-4x4, and custom layouts.
 * 
 * Features:
 * - Dynamic CSS Grid-based layout that fills container
 * - Support for merged cells via gridArea positioning
 * - Click-to-activate panel selection
 * - Active panel border highlight
 * - Panel name label overlay
 */
export function ViewLayoutPanel() {
  const { setActivePanelId } = useAppStore()
  const activeTab = useActiveTab()
  
  const layoutType = activeTab?.layoutType || 'single'
  const gridDimensions = activeTab?.gridDimensions || { rows: 1, cols: 1 }
  const panels = activeTab?.panels || {}
  const activePanelId = activeTab?.activePanelId || null
  
  // Get sorted panel IDs for consistent rendering order
  const panelIds = Object.keys(panels).sort()
  
  // Dynamic grid style based on gridDimensions
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateRows: `repeat(${gridDimensions.rows}, 1fr)`,
    gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
    gap: '4px',
    width: '100%',
    height: '100%',
  }
  
  return (
    <div style={gridStyle}>
      {panelIds.map(panelId => {
        const panel = panels[panelId]
        return (
          <PanelSlot
            key={panelId}
            panelId={panelId}
            gridArea={panel?.gridArea}
            isActive={activePanelId === panelId}
            onActivate={() => setActivePanelId(panelId)}
            showLabel={layoutType !== 'single'}
          />
        )
      })}
    </div>
  )
}

/**
 * PanelSlot - Individual panel container
 * 
 * Separate component to properly use React hooks for each panel's data.
 * Handles click activation, border styling, and label overlay.
 * Supports CSS Grid positioning via gridArea for merged cells.
 */
interface PanelSlotProps {
  panelId: string
  gridArea?: GridArea
  isActive: boolean
  onActivate: () => void
  showLabel: boolean
}

function PanelSlot({ panelId, gridArea, isActive, onActivate, showLabel }: PanelSlotProps) {
  const activeTab = useActiveTab()
  const panels = activeTab?.panels || {}
  const panel = panels[panelId]
  
  // Get chart data for this specific panel using the panel's selections
  const chartData = usePanelChartData(panelId)
  
  // Handle click to activate panel (use onMouseDown to capture before chart interaction)
  const handleActivate = (e: React.MouseEvent) => {
    // Don't activate if clicking on chart controls (like reset zoom button)
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="button"]')) {
      return
    }
    onActivate()
  }
  
  // CSS Grid positioning style
  const positionStyle: React.CSSProperties = gridArea ? {
    gridRow: `${gridArea.rowStart} / ${gridArea.rowEnd}`,
    gridColumn: `${gridArea.colStart} / ${gridArea.colEnd}`,
  } : {}
  
  return (
    <div 
      className={`
        relative overflow-hidden bg-vsc-bg
        transition-all duration-150 ease-in-out
        ${isActive 
          ? 'ring-2 ring-vsc-accent ring-inset shadow-lg' 
          : 'ring-1 ring-vsc-border hover:ring-vsc-border-light'
        }
      `}
      style={positionStyle}
      onMouseDown={handleActivate}
    >
      {/* Chart content */}
      <ChartPanel runs={chartData} panelId={panelId} isActive={isActive} onActivate={onActivate} />
      
      {/* Panel name label overlay - only show in multi-panel layouts */}
      {showLabel && (
        <div 
          className={`
            absolute top-2 left-2 z-20
            text-xs px-2 py-0.5 rounded
            bg-black/60 backdrop-blur-sm
            border border-white/10
            transition-opacity duration-150
            ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}
          `}
        >
          <span className={isActive ? 'text-vsc-accent' : 'text-white/90'}>
            {panel?.name || `Panel ${panelId}`}
          </span>
        </div>
      )}
      
      {/* Active indicator corner badge */}
      {isActive && showLabel && (
        <div className="absolute top-0 right-0 w-0 h-0 z-20 
          border-t-[24px] border-t-vsc-accent 
          border-l-[24px] border-l-transparent"
        >
          <svg 
            className="absolute -top-[22px] -right-0 w-3 h-3 text-white"
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
        </div>
      )}
    </div>
  )
}

export default ViewLayoutPanel
