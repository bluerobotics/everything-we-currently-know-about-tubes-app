import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { ChevronRight, Scissors, Plus } from 'lucide-react'
import { downsampleForUplot, calculateTargetPoints } from '../lib/downsample'
import { useAppStore, usePanelChartData, type SeriesConfig, type SlicePoint, type DataColumn, COLUMN_LABELS, COLUMN_UNITS, DEFAULT_CHART_CONFIG, type ThrusterDataPoint } from '../stores/appStore'

export interface ChartDataPoint {
  x: number
  y: number
}

export interface ChartRunData {
  id: string
  name: string
  color: string
  seriesConfig: SeriesConfig
  data: ChartDataPoint[]
}

export interface ChartPanelProps {
  // Legacy props (for backwards compat during transition)
  runs?: ChartRunData[]
  runsY2?: ChartRunData[]  // Secondary Y-axis data
  // New props for panel mode
  panelId?: string
  isActive?: boolean
  onActivate?: () => void
}

// Dash patterns for uPlot
const DASH_PATTERNS: Record<string, number[]> = {
  solid: [],
  dashed: [10, 5],
  dotted: [2, 4],
  dashDot: [10, 5, 2, 5],
}

// Grid patterns
const GRID_DASH_PATTERNS: Record<string, number[]> = {
  solid: [],
  dashed: [4, 4],
  dotted: [2, 2],
}

/**
 * Format number based on label format setting
 */
function formatValue(value: number, format: string): string {
  switch (format) {
    case 'decimal0':
      return value.toFixed(0)
    case 'decimal1':
      return value.toFixed(1)
    case 'decimal2':
      return value.toFixed(2)
    case 'decimal3':
      return value.toFixed(3)
    case 'scientific':
      return value.toExponential(2)
    case 'engineering':
      // Engineering notation (powers of 3)
      if (value === 0) return '0'
      const exp = Math.floor(Math.log10(Math.abs(value)) / 3) * 3
      const mantissa = value / Math.pow(10, exp)
      return `${mantissa.toFixed(2)}e${exp}`
    case 'auto':
    default:
      if (Math.abs(value) >= 10000 || (Math.abs(value) < 0.01 && value !== 0)) {
        return value.toExponential(2)
      }
      return value.toFixed(2)
  }
}

// Debug logging helper - set to false to reduce console spam
const DEBUG = false
const log = (...args: unknown[]) => {
  if (DEBUG) {
    console.log('[ChartPanel]', ...args)
  }
}

/**
 * Snap a value to the nearest interval
 */
function snapToInterval(value: number, interval: number): number {
  if (interval <= 0) return value
  return Math.round(value / interval) * interval
}

/**
 * High-performance chart panel using uPlot (Canvas-based).
 * Handles 100,000+ data points without performance issues.
 * Supports comprehensive configuration options.
 */
// Context menu state
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  // Store the actual data when menu opens so it's available when clicking buttons
  data: {
    xValue: number
    values: Array<{ name: string; value: number | null; color: string }>
  } | null
}

// Cursor data at a specific index
interface CursorData {
  xValue: number
  values: Array<{ name: string; value: number | null; color: string }>
}

// Live cursor data state for the hover panel
interface LiveCursorState {
  visible: boolean
  xValue: number | null  // The actual cursor X value
  snappedXValue: number | null  // The snapped X value (when snapping enabled)
  values: Array<{ name: string; value: number | null; color: string }>
  // Cursor screen position for tooltip
  cursorX: number
  cursorY: number
}

// Snapped marker positions for rendering
interface SnappedMarker {
  screenX: number
  screenY: number
  color: string
}

export function ChartPanel({ runs, runsY2 = [], panelId, isActive, onActivate }: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<uPlot | null>(null)
  // Start with 0 dimensions - chart will only be created once container is measured
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  })
  
  // Live cursor state for hover display
  const [liveCursor, setLiveCursor] = useState<LiveCursorState>({
    visible: false,
    xValue: null,
    snappedXValue: null,
    values: [],
    cursorX: 0,
    cursorY: 0,
  })
  
  // Toast notification for copy feedback
  const [toast, setToast] = useState<string | null>(null)
  
  // Snapped marker positions for custom rendering
  const [snappedMarkers, setSnappedMarkers] = useState<SnappedMarker[]>([])
  
  // Track current cursor index and position for context menu
  const cursorIdxRef = useRef<number | null>(null)
  const cursorPosRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 })
  // Track chart bbox for coordinate transformations (plot area offset within canvas)
  const bboxRef = useRef<{ left: number; top: number; width: number; height: number }>({ left: 0, top: 0, width: 0, height: 0 })
  // Debounced hide timeout to prevent flickering when cursor briefly leaves chart
  const hideTimeoutRef = useRef<number | null>(null)
  // Track last valid cursor index for right-click context menu fallback
  const lastValidIdxRef = useRef<number | null>(null)
  // Track last valid cursor position (for when uPlot's cursor becomes stale)
  const lastValidPosRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 })
  // Track whether mouse is currently over the chart container
  const isMouseOverChartRef = useRef<boolean>(false)
  
  // Panel-aware data and config loading
  // If panelId is provided, use panel-specific data and config
  // Otherwise fall back to legacy props and global config (backwards compat)
  const getActiveTab = useAppStore(state => state.getActiveTab)
  const activeTab = getActiveTab()
  const globalChartConfig = activeTab?.chartConfig ?? DEFAULT_CHART_CONFIG
  const panelConfig = panelId && activeTab ? activeTab.panels[panelId] : null
  const panelChartData = usePanelChartData(panelId ?? '')
  
  // Determine which chart config to use
  const chartConfig = panelId && panelConfig 
    ? panelConfig.chartConfig 
    : globalChartConfig
  
  // Determine which run data to use
  // If panelId provided: use panel-specific data from usePanelChartData
  // If no panelId: use legacy runs prop
  const effectiveRuns = panelId ? panelChartData : (runs ?? [])
  const effectiveRunsY2 = panelId ? [] : runsY2  // Y2 data from props only in legacy mode
  
  const { xAxis, yAxis, y2Axis, display, data: dataConfig } = chartConfig

  // Log props on every render
  log('Render - runs:', effectiveRuns.length, 'runsY2:', effectiveRunsY2.length, 'panelId:', panelId)
  log('Render - dimensions:', dimensions)
  log('Render - runs data:', effectiveRuns.map(r => ({ id: r.id, name: r.name, dataPoints: r.data.length })))

  // Observe container size changes
  useEffect(() => {
    log('useEffect[dimensions] - mounting')
    const container = containerRef.current
    if (!container) {
      log('useEffect[dimensions] - NO CONTAINER REF!')
      return
    }
    log('useEffect[dimensions] - container exists:', container.tagName, container.className)

    // Function to measure and set dimensions
    const measureContainer = (source: string) => {
      const rect = container.getBoundingClientRect()
      log(`measureContainer(${source}) - rect:`, { width: rect.width, height: rect.height, top: rect.top, left: rect.left })
      log(`measureContainer(${source}) - offsetWidth/Height:`, container.offsetWidth, container.offsetHeight)
      log(`measureContainer(${source}) - clientWidth/Height:`, container.clientWidth, container.clientHeight)
      
      if (rect.width > 0 && rect.height > 0) {
        log(`measureContainer(${source}) - SETTING dimensions to:`, Math.floor(rect.width), Math.floor(rect.height))
        setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
        return true
      }
      log(`measureContainer(${source}) - dimensions are 0, not setting`)
      return false
    }

    // Try to get initial size after layout completes
    requestAnimationFrame(() => {
      log('requestAnimationFrame callback')
      if (!measureContainer('raf')) {
        // If still 0, try again after a short delay
        log('Scheduling 100ms retry...')
        setTimeout(() => {
          log('100ms retry callback')
          measureContainer('timeout')
        }, 100)
      }
    })

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        log('ResizeObserver - contentRect:', { width, height })
        if (width > 0 && height > 0) {
          log('ResizeObserver - SETTING dimensions to:', Math.floor(width), Math.floor(height))
          setDimensions({ width: Math.floor(width), height: Math.floor(height) })
        } else {
          log('ResizeObserver - dimensions are 0, not setting')
        }
      }
    })

    resizeObserver.observe(container)
    log('ResizeObserver attached')
    
    return () => {
      log('useEffect[dimensions] - cleanup')
      resizeObserver.disconnect()
    }
  }, [])

  // Combine primary and secondary Y-axis runs
  const allRuns = useMemo(() => {
    const combined = [...effectiveRuns, ...effectiveRunsY2]
    log('useMemo[allRuns] - combined:', combined.length, 'runs')
    return combined
  }, [effectiveRuns, effectiveRunsY2])

  // Convert run data to uPlot format and downsample
  const chartData = useMemo(() => {
    log('useMemo[chartData] - START, allRuns:', allRuns.length, 'dimensions.width:', dimensions.width)
    
    if (allRuns.length === 0) {
      log('useMemo[chartData] - RETURNING NULL: no runs')
      return null
    }

    // Log each run's data info for debugging
    allRuns.forEach((run, i) => {
      const firstX = run.data[0]?.x
      const lastX = run.data[run.data.length - 1]?.x
      log(`Run ${i} "${run.name}": ${run.data.length} points, X range: ${firstX} to ${lastX}`)
    })

    // Collect all unique X values and sort them
    // Round X values to avoid floating point precision issues
    const xSet = new Set<number>()
    let totalPoints = 0
    let sampleX: number[] = []
    let sampleY: number[] = []
    
    allRuns.forEach((run, i) => {
      totalPoints += run.data.length
      run.data.forEach((point, j) => {
        // Round to 6 decimal places to avoid floating point precision issues
        const roundedX = Math.round(point.x * 1000000) / 1000000
        xSet.add(roundedX)
        // Capture first few samples for debugging
        if (i === 0 && j < 3) {
          sampleX.push(point.x)
          sampleY.push(point.y)
        }
      })
    })
    
    log('useMemo[chartData] - totalPoints:', totalPoints, 'unique X values:', xSet.size)
    log('useMemo[chartData] - sample X values:', sampleX)
    log('useMemo[chartData] - sample Y values:', sampleY)
    
    const xValues = Array.from(xSet).sort((a, b) => a - b)

    if (xValues.length === 0) {
      log('useMemo[chartData] - RETURNING NULL: no X values')
      return null
    }
    
    log('useMemo[chartData] - X range:', xValues[0], 'to', xValues[xValues.length - 1])

    // Create lookup maps for each run's data for O(1) access
    // Use rounded X values for keys to match the rounded xSet
    const runMaps = allRuns.map((run) => {
      const map = new Map<number, number>()
      run.data.forEach((point) => {
        const roundedX = Math.round(point.x * 1000000) / 1000000
        map.set(roundedX, point.y)
      })
      return map
    })

    // Build series arrays (null for missing values)
    const seriesArrays: (number | null)[][] = allRuns.map((run, runIndex) => {
      let nullCount = 0
      const arr = xValues.map((x) => {
        const value = runMaps[runIndex].get(x)
        if (value === undefined) nullCount++
        return value !== undefined ? value : null
      })
      log(`Run ${runIndex} "${run.name}": ${nullCount} nulls out of ${arr.length}`)
      return arr
    })

    // Downsample based on chart width and config
    const targetPoints = dataConfig.downsamplingMethod === 'none' 
      ? xValues.length 
      : Math.min(dataConfig.maxPoints, calculateTargetPoints(dimensions.width, 2))
    
    log('useMemo[chartData] - targetPoints:', targetPoints, 'downsamplingMethod:', dataConfig.downsamplingMethod)
    
    const downsampled = downsampleForUplot(xValues, seriesArrays, targetPoints)
    
    log('useMemo[chartData] - downsampled result:', downsampled ? `${downsampled.length} series, ${(downsampled[0] as number[])?.length} points` : 'NULL')
    
    return downsampled
  }, [allRuns, dimensions.width, dataConfig.downsamplingMethod, dataConfig.maxPoints])

  // Create uPlot options
  const options = useMemo((): uPlot.Options => {
    const gridOpacity = display.gridOpacity / 100
    const gridColor = `rgba(60, 60, 60, ${gridOpacity})`
    const axisColor = '#858585'

    // Build series configuration
    const series: uPlot.Series[] = [
      {}, // x-axis (required placeholder)
      ...allRuns.map((run, idx) => {
        const config = run.seriesConfig
        const isY2 = config.yAxisId === 'y2' && y2Axis.enabled
        
        // Determine path renderer based on interpolation
        // Only use custom paths for non-linear interpolation
        let paths: uPlot.Series.PathBuilder | undefined
        if (config.interpolation === 'spline' && uPlot.paths.spline) {
          paths = uPlot.paths.spline()
        } else if (config.interpolation === 'stepBefore' && uPlot.paths.stepped) {
          paths = uPlot.paths.stepped({ align: -1 })
        } else if (config.interpolation === 'stepAfter' && uPlot.paths.stepped) {
          paths = uPlot.paths.stepped({ align: 1 })
        }
        // For 'linear' or default, don't set paths - let uPlot use its default
        
        const seriesConfig: uPlot.Series = {
          label: run.name,
          stroke: config.color,
          width: config.lineWidth,
          dash: DASH_PATTERNS[config.dashPattern]?.length > 0 ? DASH_PATTERNS[config.dashPattern] : undefined,
          points: {
            show: config.showPoints,
            size: config.pointSize,
            fill: config.color,
            stroke: config.color,
          },
          spanGaps: config.connectGaps,
          scale: isY2 ? 'y2' : 'y',
          show: config.visible,
        }
        
        // Only add paths if non-default
        if (paths) {
          seriesConfig.paths = paths
        }
        
        // Only add fill if enabled
        if (config.fillArea) {
          seriesConfig.fill = `rgba(${hexToRgb(config.color)}, ${config.fillOpacity / 100})`
        }
        
        // Debug: Log the ACTUAL uPlot series config being created
        log(`Series ${idx} uPlot config:`, JSON.stringify({
          label: seriesConfig.label,
          stroke: seriesConfig.stroke,
          width: seriesConfig.width,
          show: seriesConfig.show,
          scale: seriesConfig.scale,
          pointsShow: seriesConfig.points?.show,
        }))
        
        return seriesConfig
      }),
    ]
    
    log('Total series count:', series.length)

    // Build scales
    const scales: uPlot.Scales = {
      x: {
        time: false,
        auto: xAxis.autoRange,
        ...((!xAxis.autoRange && xAxis.min !== null && xAxis.max !== null) 
          ? { min: xAxis.min, max: xAxis.max } 
          : {}),
      },
      y: {
        auto: yAxis.autoRange,
        ...(yAxis.scaleType === 'log' ? { distr: 3 } : {}),
        ...((!yAxis.autoRange && yAxis.min !== null && yAxis.max !== null) 
          ? { min: yAxis.min, max: yAxis.max } 
          : {}),
      },
    }

    // Add secondary Y-axis scale if enabled
    if (y2Axis.enabled) {
      scales.y2 = {
        auto: y2Axis.autoRange,
        ...(y2Axis.scaleType === 'log' ? { distr: 3 } : {}),
        ...((!y2Axis.autoRange && y2Axis.min !== null && y2Axis.max !== null) 
          ? { min: y2Axis.min, max: y2Axis.max } 
          : {}),
      }
    }

    // Build axes
    const axes: uPlot.Axis[] = [
      {
        // X axis
        stroke: axisColor,
        grid: {
          show: display.showGridX,
          stroke: gridColor,
          width: 1,
          dash: GRID_DASH_PATTERNS[display.gridStyle],
        },
        ticks: {
          stroke: gridColor,
          width: 1,
        },
        values: (_, ticks) => ticks.map((v) => formatValue(v, xAxis.labelFormat) + (xAxis.column === 'time' ? 's' : '')),
        font: '11px "Segoe UI", sans-serif',
        labelFont: '12px "Segoe UI", sans-serif',
        label: xAxis.label || COLUMN_LABELS[xAxis.column],
        labelSize: 20,
        gap: 5,
        show: xAxis.showAxis,
        // Grid interval in data units (null/undefined = auto)
        ...(display.gridIntervalX != null && display.gridIntervalX > 0 ? { incrs: [display.gridIntervalX] } : {}),
      },
      {
        // Y axis (primary)
        stroke: axisColor,
        grid: {
          show: display.showGridY,
          stroke: gridColor,
          width: 1,
          dash: GRID_DASH_PATTERNS[display.gridStyle],
        },
        ticks: {
          stroke: gridColor,
          width: 1,
        },
        values: (_, ticks) => ticks.map((v) => formatValue(v, yAxis.labelFormat)),
        font: '11px "Segoe UI", sans-serif',
        labelFont: '12px "Segoe UI", sans-serif',
        label: yAxis.label || COLUMN_LABELS[yAxis.column],
        labelSize: 30,
        gap: 5,
        size: 60,
        show: yAxis.showAxis,
        scale: 'y',
        // Grid interval in data units (null/undefined = auto)
        ...(display.gridIntervalY != null && display.gridIntervalY > 0 ? { incrs: [display.gridIntervalY] } : {}),
      },
    ]

    // Add secondary Y-axis if enabled
    if (y2Axis.enabled) {
      axes.push({
        stroke: axisColor,
        grid: { show: false }, // Don't show grid for secondary axis
        ticks: {
          stroke: gridColor,
          width: 1,
        },
        values: (_, ticks) => ticks.map((v) => formatValue(v, y2Axis.labelFormat)),
        font: '11px "Segoe UI", sans-serif',
        labelFont: '12px "Segoe UI", sans-serif',
        label: y2Axis.label || COLUMN_LABELS[y2Axis.column],
        labelSize: 30,
        gap: 5,
        size: 60,
        side: 1, // Right side
        show: y2Axis.showAxis,
        scale: 'y2',
      })
    }

    // Cursor configuration with point markers
    const cursor: uPlot.Cursor = {
      show: display.showCrosshair,
      x: display.showCrosshair,
      y: display.showCrosshair,
      drag: {
        x: display.zoomMode === 'x' || display.zoomMode === 'xy',
        y: display.zoomMode === 'y' || display.zoomMode === 'xy',
        setScale: display.zoomMode !== 'none',
      },
      sync: {
        key: 'thruster-chart',
      },
      // Show point markers at cursor position on each series
      points: {
        show: true,
        size: 10,
        fill: (u, seriesIdx) => {
          // Use the series color for the point fill
          const series = u.series[seriesIdx]
          return series?.stroke as string || '#fff'
        },
        stroke: () => '#fff',  // White border for visibility
        width: 2,
      },
    }
    
    // We can't use React state setters inside uPlot hooks safely
    // So we'll use a ref and update state in a requestAnimationFrame
    const hooks: uPlot.Hooks.Arrays = {
      setCursor: [
        (u) => {
          const idx = u.cursor.idx
          cursorIdxRef.current = idx ?? null
          // Track cursor screen position
          if (u.cursor.left !== undefined && u.cursor.top !== undefined) {
            cursorPosRef.current = { left: u.cursor.left, top: u.cursor.top }
            // Debug: log raw cursor values and bbox for diagnosis
            log('setCursor - raw cursor:', { left: u.cursor.left, top: u.cursor.top }, 
                'bbox:', bboxRef.current,
                'idx:', idx)
          }
        }
      ],
    }

    // Legend configuration
    const legend: uPlot.Legend = {
      show: display.legendPosition !== 'none',
      live: display.legendLive,
      markers: {
        width: 12,
        stroke: 'transparent',
      },
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
      padding: [20, y2Axis.enabled ? 80 : 20, 10, 10],
      cursor,
      scales,
      axes,
      series,
      legend,
      hooks,
    }
  }, [allRuns, dimensions, display, xAxis, yAxis, y2Axis, dataConfig])

  // Create/update chart - only when we have valid dimensions
  useEffect(() => {
    log('useEffect[chart] - START')
    log('useEffect[chart] - conditions:', {
      hasContainer: !!containerRef.current,
      hasChartData: !!chartData,
      allRunsLength: allRuns.length,
      dimensionsWidth: dimensions.width,
      dimensionsHeight: dimensions.height,
    })
    
    const container = containerRef.current
    // Don't create chart until container has valid dimensions
    if (!container) {
      log('useEffect[chart] - SKIP: no container')
      return
    }
    if (!chartData) {
      log('useEffect[chart] - SKIP: no chartData')
      if (chartRef.current) {
        log('useEffect[chart] - destroying existing chart (no data)')
        chartRef.current.destroy()
        chartRef.current = null
      }
      return
    }
    if (allRuns.length === 0) {
      log('useEffect[chart] - SKIP: no runs')
      return
    }
    if (dimensions.width === 0 || dimensions.height === 0) {
      log('useEffect[chart] - SKIP: dimensions are 0')
      return
    }

    // Destroy previous chart
    if (chartRef.current) {
      log('useEffect[chart] - destroying previous chart')
      chartRef.current.destroy()
      chartRef.current = null
    }

    // Create new chart with measured dimensions
    log('useEffect[chart] - CREATING uPlot chart!')
    log('useEffect[chart] - options dimensions:', options.width, 'x', options.height)
    log('useEffect[chart] - chartData series count:', chartData.length)
    log('useEffect[chart] - chartData[0] length:', (chartData[0] as number[])?.length)
    
    try {
      chartRef.current = new uPlot(options, chartData as uPlot.AlignedData, container)
      log('useEffect[chart] - uPlot chart CREATED successfully!')
      
      // Capture the bbox for coordinate transformations
      // bbox gives us the plot area offset within the canvas
      if (chartRef.current.bbox) {
        bboxRef.current = {
          left: chartRef.current.bbox.left,
          top: chartRef.current.bbox.top,
          width: chartRef.current.bbox.width,
          height: chartRef.current.bbox.height,
        }
        log('useEffect[chart] - bbox captured:', bboxRef.current)
      }
    } catch (e) {
      console.error('[ChartPanel] Failed to create uPlot chart:', e)
      log('useEffect[chart] - ERROR creating chart:', e)
    }

    return () => {
      log('useEffect[chart] - cleanup')
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [chartData, options, allRuns.length, dimensions.width, dimensions.height])

  // Handle resize
  useEffect(() => {
    if (chartRef.current && dimensions.width > 0 && dimensions.height > 0) {
      chartRef.current.setSize({ width: dimensions.width, height: dimensions.height })
      
      // Update bbox after resize (setSize triggers a redraw which updates bbox)
      if (chartRef.current.bbox) {
        bboxRef.current = {
          left: chartRef.current.bbox.left,
          top: chartRef.current.bbox.top,
          width: chartRef.current.bbox.width,
          height: chartRef.current.bbox.height,
        }
      }
    }
  }, [dimensions])

  // Helper function to find nearest value or interpolate for a series at a given X
  const findValueAtX = useCallback((run: ChartRunData, targetX: number): number | null => {
    const data = run.data
    if (data.length === 0) return null
    
    // Binary search to find the closest point(s)
    let left = 0
    let right = data.length - 1
    
    // Handle edge cases
    if (targetX <= data[0].x) return data[0].y
    if (targetX >= data[right].x) return data[right].y
    
    // Binary search for the insertion point
    while (left < right - 1) {
      const mid = Math.floor((left + right) / 2)
      if (data[mid].x <= targetX) {
        left = mid
      } else {
        right = mid
      }
    }
    
    // Now left and right are adjacent points bracketing targetX
    const x0 = data[left].x
    const x1 = data[right].x
    const y0 = data[left].y
    const y1 = data[right].y
    
    // Linear interpolation
    const t = (targetX - x0) / (x1 - x0)
    return y0 + t * (y1 - y0)
  }, [])

  // Update live cursor values when cursor moves
  useEffect(() => {
    let animationFrameId: number
    let lastIdx: number | null = null
    let lastLeft: number = 0
    
    const updateCursor = () => {
      const idx = cursorIdxRef.current
      const pos = cursorPosRef.current
      const chart = chartRef.current
      
      // Use mouse-over state as the primary visibility indicator
      // uPlot's cursor.idx can become null even when mouse is over chart (when stationary)
      const isMouseOver = isMouseOverChartRef.current
      const hasValidData = chartData && chart
      
      // Determine if we should show the cursor elements
      // Show if: mouse is over chart AND we have valid data AND we have a valid index (current or last)
      const effectiveIdx = idx ?? lastValidIdxRef.current
      const shouldShow = isMouseOver && hasValidData && effectiveIdx !== null && effectiveIdx >= 0
      
      // ALWAYS manage hide timeout (outside the change-detection block)
      if (!shouldShow) {
        // Schedule hide if not already scheduled
        if (!hideTimeoutRef.current) {
          hideTimeoutRef.current = window.setTimeout(() => {
            setLiveCursor({ visible: false, xValue: null, snappedXValue: null, values: [], cursorX: 0, cursorY: 0 })
            setSnappedMarkers([])
            hideTimeoutRef.current = null
          }, 150) // 150ms delay before hiding
        }
      } else {
        // Should show - cancel any pending hide timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = null
        }
        
        // Track last valid index and position when we have a real cursor position
        const hasRealCursorData = idx !== null && idx >= 0
        if (hasRealCursorData) {
          lastValidIdxRef.current = idx
          lastValidPosRef.current = { left: pos.left, top: pos.top }
        }
        
        // Use effective index (current or last valid) for display
        const displayIdx = effectiveIdx!
        // Use current position if valid, otherwise use last valid position
        const displayPos = hasRealCursorData ? pos : lastValidPosRef.current
        
        // Only update state if something changed (for performance)
        const posChanged = Math.abs(displayPos.left - lastLeft) > 1
        if (displayIdx !== lastIdx || posChanged) {
          lastIdx = displayIdx
          lastLeft = displayPos.left
          
          const xValues = chartData[0] as number[]
          if (displayIdx < xValues.length) {
            // Get the X value at the cursor's data point index
            const dataPointXValue = xValues[displayIdx]
            
            // Calculate snapped X value based on cursor position, not data point
            // This ensures snapping works correctly even with sparse data (like slices)
            const snapInterval = xAxis.cursorSnapInterval || 0.1  // Fallback to 0.1
            let xValue: number
            let snappedXValue: number | null
            
            if (xAxis.cursorSnapEnabled && snapInterval > 0) {
              // Convert cursor screen position directly to data value for accurate snapping
              // This bypasses the sparse data point issue
              const cursorDataX = chart.posToVal(displayPos.left, 'x')
              snappedXValue = snapToInterval(cursorDataX, snapInterval)
              xValue = cursorDataX  // Store actual cursor position for reference
            } else {
              // No snapping - use the data point's X value
              xValue = dataPointXValue
              snappedXValue = null
            }
            
            // Use the snapped X value for interpolation when snapping is enabled
            const targetX = xAxis.cursorSnapEnabled && snappedXValue !== null ? snappedXValue : xValue
            
            const values: LiveCursorState['values'] = []
            const markers: SnappedMarker[] = []
            
            // For each series, find the interpolated value at the target X position
            for (let i = 0; i < allRuns.length; i++) {
              const run = allRuns[i]
              // Check if this X is within the run's data range
              const runData = run.data
              if (runData.length === 0) {
                values.push({ name: run.name, value: null, color: run.color })
                continue
              }
              
              const minX = runData[0].x
              const maxX = runData[runData.length - 1].x
              
              // Only interpolate if X is within the run's range (with small tolerance)
              if (targetX >= minX - 0.001 && targetX <= maxX + 0.001) {
                const interpolatedValue = findValueAtX(run, targetX)
                values.push({
                  name: run.name,
                  value: interpolatedValue,
                  color: run.color,
                })
                
                // Calculate screen position for marker (always, regardless of snapping)
                if (interpolatedValue !== null) {
                  // valToPos returns position in CSS pixels relative to plot area
                  // bbox is in canvas pixels, need to convert to CSS pixels
                  const bbox = bboxRef.current
                  const dpr = window.devicePixelRatio || 1
                  const bboxLeftCSS = bbox.left / dpr
                  const bboxTopCSS = bbox.top / dpr
                  
                  // Use snapped X for position if snapping is enabled, otherwise use actual X
                  const markerXValue = xAxis.cursorSnapEnabled && snappedXValue !== null ? snappedXValue : xValue
                  const plotAreaX = chart.valToPos(markerXValue, 'x')
                  const scale = run.seriesConfig.yAxisId === 'y2' && y2Axis.enabled ? 'y2' : 'y'
                  const plotAreaY = chart.valToPos(interpolatedValue, scale)
                  
                  // Add bbox offset (in CSS pixels) to convert from plot-area-relative to container-relative
                  const screenX = plotAreaX + bboxLeftCSS
                  const screenY = plotAreaY + bboxTopCSS
                  
                  markers.push({
                    screenX,
                    screenY,
                    color: run.color,
                  })
                }
              } else {
                // X is outside this run's range
                values.push({ name: run.name, value: null, color: run.color })
              }
            }
            
            setLiveCursor({ 
              visible: true, 
              xValue,
              snappedXValue: xAxis.cursorSnapEnabled ? snappedXValue : null,
              values,
              cursorX: displayPos.left,
              cursorY: displayPos.top,
            })
            
            setSnappedMarkers(markers)
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(updateCursor)
    }
    
    if (chartData && allRuns.length > 0) {
      animationFrameId = requestAnimationFrame(updateCursor)
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      // Clean up hide timeout on unmount
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
    }
  }, [chartData, allRuns, findValueAtX, xAxis.cursorSnapEnabled, xAxis.cursorSnapInterval, y2Axis.enabled])

  // Reset zoom handler
  const handleResetZoom = useCallback(() => {
    if (chartRef.current && chartData) {
      const xData = chartData[0] as number[]
      const xMin = xData[0]
      const xMax = xData[xData.length - 1]
      
      // Find y min/max across all series
      let yMin = Infinity
      let yMax = -Infinity
      let y2Min = Infinity
      let y2Max = -Infinity
      
      for (let i = 1; i < chartData.length; i++) {
        const seriesData = chartData[i] as (number | null)[]
        const isY2 = i > (effectiveRuns?.length ?? 0) && y2Axis.enabled
        
        for (const val of seriesData) {
          if (val !== null) {
            if (isY2) {
              y2Min = Math.min(y2Min, val)
              y2Max = Math.max(y2Max, val)
            } else {
              yMin = Math.min(yMin, val)
              yMax = Math.max(yMax, val)
            }
          }
        }
      }
      
      // Add 5% padding
      const yPadding = (yMax - yMin) * 0.05 || 1
      const y2Padding = (y2Max - y2Min) * 0.05 || 1
      
      chartRef.current.setScale('x', { min: xMin, max: xMax })
      chartRef.current.setScale('y', { min: yMin - yPadding, max: yMax + yPadding })
      
      if (y2Axis.enabled && y2Min !== Infinity) {
        chartRef.current.setScale('y2', { min: y2Min - y2Padding, max: y2Max + y2Padding })
      }
    }
  }, [chartData, effectiveRuns.length, y2Axis.enabled])

  // Get cursor data at current index - uses interpolation like live cursor
  // Falls back to lastValidIdxRef for right-click context menu when current cursor is null
  const getCursorData = useCallback((): CursorData | null => {
    // Use current cursor index, or fall back to last valid index for right-click support
    const idx = cursorIdxRef.current ?? lastValidIdxRef.current
    if (!chartData || idx === null) return null
    
    const xValues = chartData[0] as number[]
    
    if (idx < 0 || idx >= xValues.length) return null
    
    const xValue = xValues[idx]
    const values: CursorData['values'] = []
    
    // For each series, find the interpolated value at this X position
    for (let i = 0; i < allRuns.length; i++) {
      const run = allRuns[i]
      const runData = run.data
      
      if (runData.length === 0) {
        values.push({ name: run.name, value: null, color: run.color })
        continue
      }
      
      const minX = runData[0].x
      const maxX = runData[runData.length - 1].x
      
      // Only interpolate if X is within the run's data range
      if (xValue >= minX - 0.001 && xValue <= maxX + 0.001) {
        const interpolatedValue = findValueAtX(run, xValue)
        values.push({
          name: run.name,
          value: interpolatedValue,
          color: run.color,
        })
      } else {
        // X is outside this run's range
        values.push({ name: run.name, value: null, color: run.color })
      }
    }
    
    return { xValue, values }
  }, [chartData, allRuns, findValueAtX])

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    
    // Capture cursor data at the moment of right-click
    const data = getCursorData()
    if (!data) return
    
    console.log('[ChartPanel] Context menu data:', {
      xValue: data.xValue,
      valuesCount: data.values.length,
      values: data.values.map(v => ({ name: v.name, value: v.value }))
    })
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      data: data,
    })
  }, [getCursorData])

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }))
  }, [])

  // Show toast notification
  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 1500)
  }, [])

  // Copy helper function
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied!')
    }).catch(err => {
      console.error('Failed to copy:', err)
      showToast('Copy failed')
    })
    closeContextMenu()
  }, [closeContextMenu, showToast])

  // Copy as tab-separated (pastes into spreadsheet cells)
  const copyAsTabSeparated = useCallback(() => {
    const data = contextMenu.data
    if (!data) return
    
    const headers = [xAxis.label || COLUMN_LABELS[xAxis.column], ...data.values.map(v => v.name)]
    const values = [
      formatValue(data.xValue, xAxis.labelFormat),
      ...data.values.map(v => v.value !== null ? formatValue(v.value, yAxis.labelFormat) : '')
    ]
    
    copyToClipboard(headers.join('\t') + '\n' + values.join('\t'))
  }, [contextMenu.data, xAxis, yAxis, copyToClipboard])

  // Copy as comma-separated (CSV format)
  const copyAsCommaSeparated = useCallback(() => {
    const data = contextMenu.data
    if (!data) return
    
    const headers = [xAxis.label || COLUMN_LABELS[xAxis.column], ...data.values.map(v => v.name)]
    const values = [
      formatValue(data.xValue, xAxis.labelFormat),
      ...data.values.map(v => v.value !== null ? formatValue(v.value, yAxis.labelFormat) : '')
    ]
    
    copyToClipboard(headers.join(',') + '\n' + values.join(','))
  }, [contextMenu.data, xAxis, yAxis, copyToClipboard])

  // Copy just the Y values (tab-separated)
  const copyYValuesTab = useCallback(() => {
    const data = contextMenu.data
    if (!data) return
    
    const values = data.values
      .filter(v => v.value !== null)
      .map(v => formatValue(v.value!, yAxis.labelFormat))
      .join('\t')
    
    if (values) copyToClipboard(values)
  }, [contextMenu.data, yAxis, copyToClipboard])

  // Copy just the Y values (comma-separated)
  const copyYValuesComma = useCallback(() => {
    const data = contextMenu.data
    if (!data) return
    
    const values = data.values
      .filter(v => v.value !== null)
      .map(v => formatValue(v.value!, yAxis.labelFormat))
      .join(',')
    
    if (values) copyToClipboard(values)
  }, [contextMenu.data, yAxis, copyToClipboard])

  // ============ SLICE CREATION ============
  
  // Get slice-related actions and state from store
  const createSliceAtPosition = useAppStore(state => state.createSliceAtPosition)
  const sliceCollections = activeTab?.sliceCollections ?? []
  const testSessions = activeTab?.testSessions ?? []
  
  // Slice submenu state
  const [sliceSubmenuVisible, setSliceSubmenuVisible] = useState(false)
  
  // Helper: Get full ThrusterDataPoint[] data for a segment or run by ID
  const getFullDataForId = useCallback((id: string): ThrusterDataPoint[] => {
    // ID format: either "runId:segment-N" or just "runId"
    const isSegment = id.includes(':segment-')
    
    for (const session of testSessions) {
      for (const run of session.runs) {
        if (isSegment) {
          // Check if this is the segment's parent run
          const [runId, segmentPart] = id.split(':segment-')
          if (run.id === runId && run.segmentData) {
            const segmentIndex = parseInt(segmentPart, 10)
            if (run.segmentData[segmentIndex]) {
              return run.segmentData[segmentIndex].data
            }
          }
        } else {
          // Check if this is the run itself
          if (run.id === id) {
            return run.data
          }
        }
      }
    }
    return []
  }, [testSessions])
  
  // Helper: Interpolate a column value at a specific X position
  const interpolateColumnAtX = useCallback((
    dataPoints: ThrusterDataPoint[],
    targetX: number,
    xColumn: DataColumn,
    valueColumn: DataColumn
  ): number | null => {
    if (dataPoints.length === 0) return null
    
    // Find the two points surrounding targetX
    let lowIdx = -1
    let highIdx = -1
    
    for (let i = 0; i < dataPoints.length; i++) {
      const x = dataPoints[i][xColumn] as number
      if (x <= targetX) {
        lowIdx = i
      }
      if (x >= targetX && highIdx === -1) {
        highIdx = i
      }
    }
    
    // Edge cases
    if (lowIdx === -1) return dataPoints[0][valueColumn] as number
    if (highIdx === -1) return dataPoints[dataPoints.length - 1][valueColumn] as number
    if (lowIdx === highIdx) return dataPoints[lowIdx][valueColumn] as number
    
    // Linear interpolation
    const lowPoint = dataPoints[lowIdx]
    const highPoint = dataPoints[highIdx]
    const lowX = lowPoint[xColumn] as number
    const highX = highPoint[xColumn] as number
    const lowVal = lowPoint[valueColumn] as number
    const highVal = highPoint[valueColumn] as number
    
    if (highX === lowX) return lowVal
    
    const ratio = (targetX - lowX) / (highX - lowX)
    return lowVal + ratio * (highVal - lowVal)
  }, [])
  
  // All available data columns
  const ALL_COLUMNS: DataColumn[] = ['time', 'pwm', 'loadCell', 'thrust', 'voltage', 'current', 'rpm', 'efficiency']
  
  // Build slice points from the current context menu data - captures ALL columns
  const buildSlicePoints = useCallback((): SlicePoint[] => {
    const data = contextMenu.data
    if (!data) return []
    
    return data.values
      .filter(v => v.value !== null)
      .map(v => {
        // Find the chart run to get its ID
        const chartRun = allRuns.find(r => r.name === v.name)
        const runId = chartRun?.id ?? v.name
        
        // Get the full original data for this segment/run
        const fullData = getFullDataForId(runId)
        
        // Build values with ALL columns by interpolating from original data
        const values: Partial<Record<DataColumn, number>> = {}
        
        if (fullData.length > 0) {
          // Interpolate ALL columns at this X position
          ALL_COLUMNS.forEach(col => {
            const interpolatedValue = interpolateColumnAtX(fullData, data.xValue, xAxis.column, col)
            if (interpolatedValue !== null) {
              values[col] = interpolatedValue
            }
          })
        } else {
          // Fallback: just store the current X and Y values
          values[xAxis.column] = data.xValue
          values[yAxis.column] = v.value as number
        }
        
        return {
          segmentId: runId,
          segmentName: v.name,
          color: v.color,
          values,
        }
      })
  }, [contextMenu.data, allRuns, xAxis.column, yAxis.column, getFullDataForId, interpolateColumnAtX])
  
  // Create a new slice in a new collection
  const handleCreateSliceNewCollection = useCallback(() => {
    const data = contextMenu.data
    if (!data) return
    
    const points = buildSlicePoints()
    if (points.length === 0) {
      showToast('No data to create slice')
      return
    }
    
    createSliceAtPosition(data.xValue, xAxis.column, points, null)
    showToast(`Created slice at ${formatValue(data.xValue, xAxis.labelFormat)}${COLUMN_UNITS[xAxis.column] || ''}`)
    closeContextMenu()
  }, [contextMenu.data, buildSlicePoints, createSliceAtPosition, xAxis.column, xAxis.labelFormat, showToast, closeContextMenu])
  
  // Add slice to existing collection
  const handleAddSliceToCollection = useCallback((collectionId: string) => {
    const data = contextMenu.data
    if (!data) return
    
    const points = buildSlicePoints()
    if (points.length === 0) {
      showToast('No data to create slice')
      return
    }
    
    createSliceAtPosition(data.xValue, xAxis.column, points, collectionId)
    showToast(`Added slice at ${formatValue(data.xValue, xAxis.labelFormat)}${COLUMN_UNITS[xAxis.column] || ''}`)
    closeContextMenu()
  }, [contextMenu.data, buildSlicePoints, createSliceAtPosition, xAxis.column, xAxis.labelFormat, showToast, closeContextMenu])

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu.visible) {
      const handleClick = () => closeContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu.visible, closeContextMenu])

  // Handle panel activation on click
  const handlePanelClick = useCallback(() => {
    onActivate?.()
  }, [onActivate])

  // Always render the container div so the ref is available for dimension measurement
  return (
    <div 
      className={`w-full h-full flex flex-col relative overflow-hidden ${
        isActive ? 'ring-2 ring-vsc-accent ring-inset' : ''
      }`}
      style={{ backgroundColor: display.backgroundColor }}
      onClick={handlePanelClick}
    >
      {/* Chart container - ALWAYS rendered so ref is attached */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full overflow-hidden"
        style={{ position: 'relative', minHeight: '200px' }}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => { isMouseOverChartRef.current = true }}
        onMouseLeave={() => { isMouseOverChartRef.current = false }}
      >
        {/* Empty state overlay - shown when no data */}
        {allRuns.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-vsc-bg text-vsc-fg-dim z-10">
            <div className="text-center">
              <p className="text-lg mb-2">No data to display</p>
              <p className="text-sm">Select test runs from the browser to view data</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Cursor markers - rendered on top of chart when markers are enabled */}
      {display.showCursorMarkers && snappedMarkers.length > 0 && (() => {
        // Convert bbox from canvas pixels to CSS pixels
        const dpr = window.devicePixelRatio || 1
        const bboxTopCSS = bboxRef.current.top / dpr
        const bboxHeightCSS = bboxRef.current.height / dpr
        const markerSize = display.cursorMarkerSize || 4
        
        return (
        <svg 
          className="absolute inset-0 pointer-events-none z-10"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          {/* Vertical line at snapped X position - only when snapping is enabled */}
          {xAxis.cursorSnapEnabled && snappedMarkers.length > 0 && (
            <line
              x1={snappedMarkers[0].screenX}
              y1={bboxTopCSS}
              x2={snappedMarkers[0].screenX}
              y2={bboxTopCSS + bboxHeightCSS}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
          {/* Markers at snapped positions - simple filled circles without border */}
          {snappedMarkers.map((marker, i) => (
            <circle
              key={i}
              cx={marker.screenX}
              cy={marker.screenY}
              r={markerSize}
              fill={marker.color}
            />
          ))}
        </svg>
        )
      })()}
      
      {/* Live cursor values tooltip - follows cursor */}
      {liveCursor.visible && allRuns.length > 0 && (() => {
        // bbox is in canvas pixels, cursor is in CSS pixels
        // Need to convert bbox to CSS pixels by dividing by devicePixelRatio
        const dpr = window.devicePixelRatio || 1
        const bboxLeftCSS = bboxRef.current.left / dpr
        const bboxTopCSS = bboxRef.current.top / dpr
        
        // Debug: log cursor positioning values
        log('Tooltip positioning:', {
          rawCursorX: liveCursor.cursorX,
          rawCursorY: liveCursor.cursorY,
          bboxLeft: bboxRef.current.left,
          bboxLeftCSS,
          dpr,
        })
        
        // uPlot cursor position is relative to plot area, need to add bbox offset
        // (converted to CSS pixels) to get container-relative coordinates
        const actualCursorX = liveCursor.cursorX + bboxLeftCSS
        
        const tooltipWidth = 220
        const gap = 20  // Gap between cursor and tooltip
        
        // By default, position tooltip to the RIGHT of cursor
        // If that would go off-screen, position to the LEFT
        const wouldGoOffRight = actualCursorX + gap + tooltipWidth > dimensions.width - 10
        
        let tooltipLeft: number
        if (wouldGoOffRight) {
          // Position to the left of cursor
          tooltipLeft = actualCursorX - gap - tooltipWidth
        } else {
          // Position to the right of cursor
          tooltipLeft = actualCursorX + gap
        }
        
        // Y position also needs bbox.top offset (cursor Y is plot-area-relative)
        const actualCursorY = liveCursor.cursorY + bboxTopCSS
        
        const tooltipStyle: React.CSSProperties = {
          position: 'absolute',
          left: tooltipLeft,
          top: Math.max(10, Math.min(actualCursorY - 20, dimensions.height - 250)),
        }
        
        // Use the snapped X value if available, otherwise the actual X value
        const displayXValue = liveCursor.snappedXValue ?? liveCursor.xValue
        
        return (
          <div 
            className="bg-vsc-bg-dark/95 border border-vsc-border rounded shadow-lg py-1.5 px-2 min-w-[180px] max-w-[280px] z-20 pointer-events-none"
            style={tooltipStyle}
          >
            {/* X value header */}
            <div className="text-xs border-b border-vsc-border pb-1 mb-1">
              <span className="text-vsc-fg-muted">{xAxis.label || COLUMN_LABELS[xAxis.column]} = </span>
              <span className="text-vsc-fg font-mono font-medium">
                {displayXValue !== null ? formatValue(displayXValue, xAxis.labelFormat) : '--'}
              </span>
            </div>
            
            {/* Series values */}
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
              {liveCursor.values.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/30"
                    style={{ backgroundColor: v.color }}
                  />
                  <span className="text-vsc-fg-dim truncate flex-1" title={v.name}>
                    {v.name}
                  </span>
                  <span className={`font-mono ${v.value !== null ? 'text-vsc-fg' : 'text-vsc-fg-muted'}`}>
                    {v.value !== null ? formatValue(v.value, yAxis.labelFormat) : '--'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-vsc-bg-dark border border-vsc-border rounded shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {/* Slice Creation Section */}
          <div className="px-3 py-1 text-xs text-vsc-fg-muted border-b border-vsc-border mb-1">
            <Scissors size={10} className="inline mr-1" />
            Create Slice @ {contextMenu.data ? formatValue(contextMenu.data.xValue, xAxis.labelFormat) : ''}
            {COLUMN_UNITS[xAxis.column] || ''}
          </div>
          <button
            onClick={handleCreateSliceNewCollection}
            className="w-full px-3 py-1.5 text-left text-sm text-vsc-fg hover:bg-vsc-highlight flex items-center gap-2"
          >
            <Plus size={14} />
            New Slice Collection
          </button>
          {sliceCollections.length > 0 && (
            <div 
              className="relative"
              onMouseEnter={() => setSliceSubmenuVisible(true)}
              onMouseLeave={() => setSliceSubmenuVisible(false)}
            >
              <button
                className="w-full px-3 py-1.5 text-left text-sm text-vsc-fg hover:bg-vsc-highlight flex items-center justify-between"
              >
                <span>Add to Collection...</span>
                <ChevronRight size={14} />
              </button>
              {/* Submenu for existing collections */}
              {sliceSubmenuVisible && (
                <div 
                  className="absolute left-full top-0 ml-0.5 bg-vsc-bg-dark border border-vsc-border rounded shadow-lg py-1 min-w-[180px]"
                >
                  {sliceCollections.map(collection => (
                    <button
                      key={collection.id}
                      onClick={() => handleAddSliceToCollection(collection.id)}
                      className="w-full px-3 py-1.5 text-left text-sm text-vsc-fg hover:bg-vsc-highlight truncate"
                      title={`${collection.name} (${collection.slices.length} slices)`}
                    >
                      {collection.name}
                      <span className="text-vsc-fg-muted ml-2">({collection.slices.length})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Copy Section */}
          <div className="px-3 py-1 text-xs text-vsc-fg-muted border-b border-t border-vsc-border mt-1 mb-1">Copy With Headers</div>
          <button
            onClick={copyAsTabSeparated}
            className="w-full px-3 py-1.5 text-left text-sm text-vsc-fg hover:bg-vsc-highlight"
          >
            Tab-separated (for Excel)
          </button>
          <button
            onClick={copyAsCommaSeparated}
            className="w-full px-3 py-1.5 text-left text-sm text-vsc-fg hover:bg-vsc-highlight"
          >
            Comma-separated (CSV)
          </button>
          <div className="px-3 py-1 text-xs text-vsc-fg-muted border-b border-t border-vsc-border mt-1 mb-1">Copy Values Only</div>
          <button
            onClick={copyYValuesTab}
            className="w-full px-3 py-1.5 text-left text-sm text-vsc-fg hover:bg-vsc-highlight"
          >
            Tab-separated
          </button>
          <button
            onClick={copyYValuesComma}
            className="w-full px-3 py-1.5 text-left text-sm text-vsc-fg hover:bg-vsc-highlight"
          >
            Comma-separated
          </button>
        </div>
      )}
      
      {/* Toast notification */}
      {toast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-vsc-accent text-white text-sm rounded shadow-lg">
          {toast}
        </div>
      )}
      
      {/* Reset zoom button - only show when there's data */}
      {allRuns.length > 0 && (
        <button
          onClick={handleResetZoom}
          className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-vsc-input hover:bg-vsc-border-light border border-vsc-border text-vsc-fg rounded transition-colors"
          title="Reset zoom (double-click chart)"
        >
          Reset Zoom
        </button>
      )}
      
      {/* Data point count indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-vsc-fg-muted">
        {dimensions.width === 0 || dimensions.height === 0 ? (
          <span className="text-vsc-warning">Measuring chart area...</span>
        ) : chartData ? (
          <>
            {(chartData[0] as number[]).length.toLocaleString()} pts displayed
            {allRuns.reduce((acc, r) => acc + r.data.length, 0) > (chartData[0] as number[]).length && (
              <span className="ml-1 text-vsc-fg-dim">
                (from {allRuns.reduce((acc, r) => acc + r.data.length, 0).toLocaleString()})
              </span>
            )}
          </>
        ) : (
          <span className="text-vsc-fg-dim">No chart data</span>
        )}
      </div>
    </div>
  )
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '128, 128, 128'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

// Re-export the old interface for backwards compatibility
export interface LegacyChartRunData {
  id: string
  name: string
  color: string
  data: Array<{ time: number; value: number }>
}
