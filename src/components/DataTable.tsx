import { useRef, useState, useEffect, useCallback } from 'react'
import type { ColumnInfo } from '../lib/thrusterData'

// ============================================================================
// Types
// ============================================================================

export interface DataTableProps {
  columns: ColumnInfo[]
  rows: string[][]  // Raw string values for each row
  rowCount: number
  xAxisColumn?: string  // Normalized name of x-axis column
  yAxisColumn?: string  // Normalized name of y-axis column
}

// Column type for color coding
type ColumnType = 'xAxis' | 'yAxis' | 'duplicate' | 'unmapped' | 'error'

// Color scheme for column types
const COLUMN_COLORS: Record<ColumnType, { bg: string; text: string; border: string }> = {
  xAxis: { bg: 'rgba(79, 195, 247, 0.15)', text: '#4fc3f7', border: '#4fc3f7' },      // Cyan
  yAxis: { bg: 'rgba(129, 199, 132, 0.15)', text: '#81c784', border: '#81c784' },     // Green
  duplicate: { bg: 'rgba(255, 183, 77, 0.15)', text: '#ffb74d', border: '#ffb74d' },  // Orange
  unmapped: { bg: 'transparent', text: '#858585', border: '#3c3c3c' },                 // Gray
  error: { bg: 'rgba(240, 98, 146, 0.15)', text: '#f06292', border: '#f06292' },      // Pink
}

// ============================================================================
// Helper Functions
// ============================================================================

function getColumnType(
  column: ColumnInfo,
  xAxisColumn?: string,
  yAxisColumn?: string
): ColumnType {
  if (column.isDuplicate) return 'duplicate'
  if (column.normalizedName === xAxisColumn) return 'xAxis'
  if (column.normalizedName === yAxisColumn) return 'yAxis'
  
  // Check if it's a known mapped column
  const knownColumns = ['time', 'pwm', 'loadCell', 'thrust', 'voltage', 'current', 'rpm', 'efficiency']
  if (knownColumns.includes(column.normalizedName)) return 'yAxis'
  
  return 'unmapped'
}

// ============================================================================
// VirtualizedDataTable Component
// ============================================================================

const ROW_HEIGHT = 28
const HEADER_HEIGHT = 36
const OVERSCAN = 5

export function DataTable({
  columns,
  rows,
  rowCount,
  xAxisColumn = 'time',
  yAxisColumn = 'thrust',
}: DataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)

  // Calculate visible range
  const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT)
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(rowCount, startIndex + visibleRowCount + OVERSCAN * 2)

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Observe container size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerHeight(entry.contentRect.height - HEADER_HEIGHT)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Calculate column widths
  const columnWidths = columns.map(col => {
    // Estimate width based on header length and typical data
    const headerLen = col.displayName.length
    return Math.max(80, Math.min(150, headerLen * 8 + 20))
  })
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0) + 60 // +60 for row number column

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-auto bg-vsc-bg-dark"
      onScroll={handleScroll}
    >
      {/* Header */}
      <div 
        className="sticky top-0 z-10 flex bg-vsc-bg-darker border-b border-vsc-border"
        style={{ height: HEADER_HEIGHT, minWidth: totalWidth }}
      >
        {/* Row number header */}
        <div 
          className="flex items-center justify-center px-2 text-xs font-medium text-vsc-fg-muted border-r border-vsc-border bg-vsc-bg-darker"
          style={{ width: 60, minWidth: 60 }}
        >
          #
        </div>
        
        {/* Column headers */}
        {columns.map((col, i) => {
          const colType = getColumnType(col, xAxisColumn, yAxisColumn)
          const colors = COLUMN_COLORS[colType]
          
          return (
            <div
              key={col.index}
              className="flex flex-col justify-center px-2 border-r border-vsc-border"
              style={{ 
                width: columnWidths[i],
                minWidth: columnWidths[i],
                backgroundColor: colors.bg,
                borderBottom: `2px solid ${colors.border}`,
              }}
              title={`${col.rawName}\n→ ${col.normalizedName}${col.isDuplicate ? ` (duplicate #${col.duplicateIndex + 1})` : ''}`}
            >
              <div 
                className="text-xs font-medium truncate"
                style={{ color: colors.text }}
              >
                {col.displayName}
              </div>
              <div className="text-[10px] text-vsc-fg-muted truncate">
                {col.normalizedName}
                {col.isDuplicate && (
                  <span className="ml-1 px-1 rounded text-[9px] bg-vsc-warning/20 text-vsc-warning">
                    #{col.duplicateIndex + 1}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Virtual scrolling container */}
      <div style={{ height: rowCount * ROW_HEIGHT, position: 'relative', minWidth: totalWidth }}>
        {/* Visible rows */}
        {Array.from({ length: endIndex - startIndex }, (_, i) => {
          const rowIndex = startIndex + i
          const row = rows[rowIndex]
          if (!row) return null

          return (
            <div
              key={rowIndex}
              className="flex absolute left-0 right-0 hover:bg-vsc-highlight border-b border-vsc-border/50"
              style={{
                top: rowIndex * ROW_HEIGHT,
                height: ROW_HEIGHT,
              }}
            >
              {/* Row number */}
              <div 
                className="flex items-center justify-end px-2 text-xs text-vsc-fg-muted border-r border-vsc-border/50 bg-vsc-bg-darker/50"
                style={{ width: 60, minWidth: 60 }}
              >
                {rowIndex + 1}
              </div>
              
              {/* Data cells */}
              {columns.map((col, colIndex) => {
                const value = row[col.index] ?? ''
                const colType = getColumnType(col, xAxisColumn, yAxisColumn)
                const isNumeric = !isNaN(parseFloat(value))
                
                return (
                  <div
                    key={col.index}
                    className={`flex items-center px-2 border-r border-vsc-border/50 font-mono text-xs truncate ${
                      isNumeric ? 'text-vsc-fg' : 'text-vsc-fg-dim'
                    }`}
                    style={{ 
                      width: columnWidths[colIndex],
                      minWidth: columnWidths[colIndex],
                      backgroundColor: colType === 'duplicate' ? 'rgba(255, 183, 77, 0.05)' : undefined,
                    }}
                    title={value}
                  >
                    {value || <span className="text-vsc-fg-muted italic">null</span>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {rowCount === 0 && (
        <div className="flex items-center justify-center h-32 text-vsc-fg-dim text-sm">
          No data rows found
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Column Legend Component
// ============================================================================

export function ColumnLegend() {
  const legendItems: { type: ColumnType; label: string }[] = [
    { type: 'xAxis', label: 'X-Axis (Time)' },
    { type: 'yAxis', label: 'Y-Axis (Data)' },
    { type: 'duplicate', label: 'Duplicate' },
    { type: 'unmapped', label: 'Unmapped' },
  ]

  return (
    <div className="flex items-center gap-4 text-xs">
      {legendItems.map(({ type, label }) => {
        const colors = COLUMN_COLORS[type]
        return (
          <div key={type} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm border"
              style={{ 
                backgroundColor: colors.bg,
                borderColor: colors.border,
              }}
            />
            <span className="text-vsc-fg-dim">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
