import { useState, useEffect, useCallback } from 'react'
import { X, FileText, Columns, Rows, Layers, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { DataTable, ColumnLegend } from './DataTable'
import type { ColumnInfo } from '../lib/thrusterData'

// ============================================================================
// Types
// ============================================================================

export interface InspectorData {
  columns: ColumnInfo[]
  rawRows: string[][]
  rowCount: number
  segmentCount: number
  rawHeaders: string[]
}

export interface DataInspectorPanelProps {
  inspectorData: InspectorData | null
  isLoading: boolean
}

// ============================================================================
// Column Summary Component
// ============================================================================

interface ColumnSummaryProps {
  columns: ColumnInfo[]
  segmentCount: number
}

function ColumnSummary({ columns, segmentCount }: ColumnSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const duplicateCount = columns.filter(c => c.isDuplicate).length
  const mappedColumns = ['time', 'pwm', 'loadCell', 'thrust', 'voltage', 'current', 'rpm', 'efficiency']
  const mappedCount = columns.filter(c => mappedColumns.includes(c.normalizedName)).length
  const unmappedCount = columns.length - mappedCount

  return (
    <div className="border-b border-vsc-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-vsc-highlight transition-colors text-sm"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Columns size={14} className="text-vsc-accent" />
        <span className="font-medium">Column Mapping</span>
        <span className="text-vsc-fg-dim ml-auto text-xs">
          {columns.length} columns
          {duplicateCount > 0 && (
            <span className="ml-2 text-vsc-warning">
              ({duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''})
            </span>
          )}
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-3 text-xs space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-vsc-bg-dark rounded p-2">
              <div className="text-vsc-fg-muted">Total</div>
              <div className="text-lg font-mono text-vsc-fg">{columns.length}</div>
            </div>
            <div className="bg-vsc-bg-dark rounded p-2">
              <div className="text-vsc-fg-muted">Mapped</div>
              <div className="text-lg font-mono text-vsc-success">{mappedCount}</div>
            </div>
            <div className="bg-vsc-bg-dark rounded p-2">
              <div className="text-vsc-fg-muted">Unmapped</div>
              <div className="text-lg font-mono text-vsc-fg-dim">{unmappedCount}</div>
            </div>
            <div className="bg-vsc-bg-dark rounded p-2">
              <div className="text-vsc-fg-muted">Segments</div>
              <div className="text-lg font-mono text-vsc-info">{segmentCount}</div>
            </div>
          </div>
          
          {/* Column mapping table */}
          <div className="mt-3">
            <div className="text-vsc-fg-dim mb-1">Column Mapping:</div>
            <div className="grid grid-cols-2 gap-1">
              {columns.map((col) => (
                <div 
                  key={col.index}
                  className={`flex items-center gap-2 px-2 py-1 rounded ${
                    col.isDuplicate ? 'bg-vsc-warning/10' : 'bg-vsc-bg'
                  }`}
                >
                  <span className="text-vsc-fg-muted w-4">{col.index}</span>
                  <span className="text-vsc-fg truncate flex-1" title={col.rawName}>
                    {col.rawName}
                  </span>
                  <span className="text-vsc-accent">→</span>
                  <span className="text-vsc-success font-mono" title={col.normalizedName}>
                    {col.normalizedName}
                  </span>
                  {col.isDuplicate && (
                    <span className="px-1 rounded bg-vsc-warning/20 text-vsc-warning text-[10px]">
                      #{col.duplicateIndex + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Warnings */}
          {duplicateCount > 0 && (
            <div className="flex items-start gap-2 p-2 bg-vsc-warning/10 rounded text-vsc-warning">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Duplicate columns detected</div>
                <div className="text-vsc-fg-dim">
                  {columns.filter(c => c.isDuplicate).map(c => c.rawName).join(', ')}
                </div>
              </div>
            </div>
          )}
          
          {segmentCount > 1 && (
            <div className="flex items-start gap-2 p-2 bg-vsc-info/10 rounded text-vsc-info">
              <Layers size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Multi-segment file</div>
                <div className="text-vsc-fg-dim">
                  This file contains {segmentCount} data segments (repeated headers)
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function DataInspectorPanel({ inspectorData, isLoading }: DataInspectorPanelProps) {
  const {
    inspectorPanelHeight,
    setInspectedRun,
    setInspectorPanelHeight,
    getRunById,
    getActiveTab,
  } = useAppStore()

  const [isResizing, setIsResizing] = useState(false)
  
  const activeTab = getActiveTab()
  const inspectedRunId = activeTab?.inspectedRunId || null
  const chartConfig = activeTab?.chartConfig
  
  const run = inspectedRunId ? getRunById(inspectedRunId) : null

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight
      const newHeight = windowHeight - e.clientY - 32 // 32px for status bar
      setInspectorPanelHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, setInspectorPanelHeight])

  if (!run) {
    return null
  }

  return (
    <div 
      className="flex flex-col flex-shrink-0 bg-vsc-panel border-t border-vsc-border"
      style={{ height: inspectorPanelHeight }}
    >
      {/* Resize handle */}
      <div
        className="h-1 bg-vsc-border hover:bg-vsc-accent cursor-row-resize transition-colors"
        onMouseDown={handleMouseDown}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-vsc-border bg-vsc-bg-dark">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-vsc-accent" />
          <div>
            <div className="text-sm font-medium text-vsc-fg">{run.name}</div>
            <div className="text-xs text-vsc-fg-muted">{run.filePath}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Stats */}
          {inspectorData && (
            <div className="flex items-center gap-4 text-xs text-vsc-fg-dim">
              <div className="flex items-center gap-1">
                <Columns size={12} />
                <span>{inspectorData.columns.length} columns</span>
              </div>
              <div className="flex items-center gap-1">
                <Rows size={12} />
                <span>{inspectorData.rowCount.toLocaleString()} rows</span>
              </div>
              {inspectorData.segmentCount > 1 && (
                <div className="flex items-center gap-1 text-vsc-info">
                  <Layers size={12} />
                  <span>{inspectorData.segmentCount} segments</span>
                </div>
              )}
            </div>
          )}
          
          {/* Close button */}
          <button
            onClick={() => setInspectedRun(null)}
            className="p-1 hover:bg-vsc-input rounded transition-colors text-vsc-fg-dim hover:text-vsc-fg"
            title="Close inspector"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-vsc-border bg-vsc-sidebar">
        <ColumnLegend />
        <div className="text-xs text-vsc-fg-muted">
          X: <span className="text-vsc-accent">{chartConfig?.xAxis.column || 'time'}</span>
          {' | '}
          Y: <span className="text-vsc-success">{chartConfig?.yAxis.column || 'thrust'}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-vsc-fg-dim">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-vsc-accent border-t-transparent rounded-full mx-auto mb-2" />
              <div className="text-sm">Loading data...</div>
            </div>
          </div>
        ) : inspectorData ? (
          <div className="flex flex-col h-full">
            {/* Column summary (collapsible) */}
            <ColumnSummary 
              columns={inspectorData.columns} 
              segmentCount={inspectorData.segmentCount}
            />
            
            {/* Data table */}
            <div className="flex-1 overflow-hidden">
              <DataTable
                columns={inspectorData.columns}
                rows={inspectorData.rawRows}
                rowCount={inspectorData.rowCount}
                xAxisColumn={chartConfig?.xAxis.column || 'time'}
                yAxisColumn={chartConfig?.yAxis.column || 'thrust'}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-vsc-fg-dim">
            <div className="text-center">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <div className="text-sm">No data available</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
