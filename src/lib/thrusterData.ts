/**
 * Thruster Data Types and CSV Parser
 * 
 * This module provides TypeScript interfaces for thruster test data
 * and a CSV parser that handles multi-segment files and duplicate columns.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ThrusterDataPoint {
  time: number           // seconds
  pwm: number            // microseconds
  loadCell: number       // grams (raw)
  thrust: number         // grams (filtered)
  voltage: number        // volts
  current: number        // amps
  rpm: number
  efficiency: number     // g/W
  [key: string]: number  // Allow dynamic column access
}

export interface TestRun {
  id: string             // unique identifier
  name: string           // filename without extension
  filePath: string       // full path
  data: ThrusterDataPoint[]
  segments: number       // count of PWM step segments
  columns?: ColumnInfo[] // Column metadata
  segmentData?: SegmentData[] // Individual segment arrays for per-segment selection
}

export interface TestSession {
  id: string
  name: string           // folder name
  folderPath: string
  runs: TestRun[]
}

// Lightweight version for initial scan (no data loaded)
export interface TestSessionMetadata {
  id: string
  name: string
  folderPath: string
  runs: TestRunMetadata[]
}

export interface TestRunMetadata {
  id: string
  name: string
  filePath: string
}

// ============================================================================
// Column Metadata Types
// ============================================================================

export interface ColumnInfo {
  index: number          // Original column index in CSV
  rawName: string        // Original header name (e.g., "Thrust [g]")
  normalizedName: string // Normalized key (e.g., "thrust")
  displayName: string    // Display name with units (e.g., "Thrust (g)")
  unit: string           // Unit extracted from header (e.g., "g")
  isDuplicate: boolean   // True if this column name appears multiple times
  duplicateIndex: number // 0 for first occurrence, 1 for second, etc.
}

export interface CSVParseResult {
  data: ThrusterDataPoint[]
  columns: ColumnInfo[]
  segments: number
  rawHeaders: string[]
}

// Segment-specific data for per-segment visualization
export interface SegmentData {
  index: number           // 0-based segment index
  data: ThrusterDataPoint[]
  startLine: number       // Line number where segment starts
  rowCount: number        // Number of data rows in this segment
}

export interface CSVParseResultWithSegments extends CSVParseResult {
  segmentData: SegmentData[]  // Individual segment data arrays
}

// ============================================================================
// Shared Constants
// ============================================================================

export const RUN_COLORS = [
  '#4fc3f7', // cyan
  '#81c784', // green
  '#ffb74d', // orange
  '#f06292', // pink
  '#ba68c8', // purple
  '#4db6ac', // teal
  '#fff176', // yellow
  '#90a4ae', // gray
]

// Standard column mappings
const COLUMN_NAME_MAP: Record<string, string> = {
  'time [s]': 'time',
  'pwm value [us]': 'pwm',
  'load cell [g]': 'loadCell',
  'thrust [g]': 'thrust',
  'voltage [v]': 'voltage',
  'current [a]': 'current',
  'rpm': 'rpm',
  'efficiency [g/w]': 'efficiency',
}

// ============================================================================
// CSV Parser - Enhanced
// ============================================================================

/**
 * Parse CSV content into an array of ThrusterDataPoint objects.
 * Returns full metadata including column info.
 * 
 * Handles:
 * - Multi-segment files (detects and skips repeated header rows)
 * - Duplicate column names (T5X files have two "Thrust [g]" columns)
 * - Empty rows
 * - Various number formats
 */
export function parseCSVWithMetadata(
  content: string,
  options: ParseOptions = {}
): CSVParseResult {
  const {
    duplicateHandling = 'last',
    segmentMode = 'continuous',
  } = options

  const lines = content.split(/\r?\n/)
  const dataPoints: ThrusterDataPoint[] = []
  
  let columnMapping: ColumnMapping | null = null
  let columns: ColumnInfo[] = []
  let rawHeaders: string[] = []
  let segmentCount = 0
  let currentSegmentData: ThrusterDataPoint[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) continue
    
    // Check if this is a header row
    if (isHeaderRow(line)) {
      // If in separate segment mode and we have data, finalize previous segment
      if (segmentMode === 'separate' && currentSegmentData.length > 0) {
        dataPoints.push(...currentSegmentData)
        currentSegmentData = []
      }
      
      const headerResult = parseHeaderRowEnhanced(line)
      columnMapping = headerResult.mapping
      columns = headerResult.columns
      rawHeaders = headerResult.rawHeaders
      segmentCount++
      continue
    }
    
    // Skip if we haven't seen a header yet
    if (!columnMapping) continue
    
    // Parse data row
    const dataPoint = parseDataRowEnhanced(line, columnMapping, duplicateHandling)
    if (dataPoint) {
      if (segmentMode === 'separate') {
        currentSegmentData.push(dataPoint)
      } else {
        dataPoints.push(dataPoint)
      }
    }
  }
  
  // Add remaining segment data
  if (segmentMode === 'separate' && currentSegmentData.length > 0) {
    dataPoints.push(...currentSegmentData)
  }
  
  return {
    data: dataPoints,
    columns,
    segments: segmentCount,
    rawHeaders,
  }
}

/**
 * Legacy function for backwards compatibility.
 * Parse CSV content into an array of ThrusterDataPoint objects.
 */
export function parseCSV(content: string): ThrusterDataPoint[] {
  return parseCSVWithMetadata(content).data
}

/**
 * Parse CSV content and return data separated by segments.
 * Each segment gets its own data array for independent visualization.
 */
export function parseCSVWithSegments(
  content: string,
  options: ParseOptions = {}
): CSVParseResultWithSegments {
  const { duplicateHandling = 'last' } = options
  
  const lines = content.split(/\r?\n/)
  const allDataPoints: ThrusterDataPoint[] = []
  const segmentData: SegmentData[] = []
  
  let columnMapping: ColumnMapping | null = null
  let columns: ColumnInfo[] = []
  let rawHeaders: string[] = []
  let segmentCount = 0
  let currentSegmentData: ThrusterDataPoint[] = []
  let currentSegmentStartLine = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) continue
    
    // Check if this is a header row
    if (isHeaderRow(line)) {
      // Finalize previous segment if it has data
      if (currentSegmentData.length > 0) {
        segmentData.push({
          index: segmentCount - 1,
          data: [...currentSegmentData],
          startLine: currentSegmentStartLine,
          rowCount: currentSegmentData.length,
        })
        allDataPoints.push(...currentSegmentData)
        currentSegmentData = []
      }
      
      const headerResult = parseHeaderRowEnhanced(line)
      columnMapping = headerResult.mapping
      columns = headerResult.columns
      rawHeaders = headerResult.rawHeaders
      currentSegmentStartLine = i + 1
      segmentCount++
      continue
    }
    
    // Skip if we haven't seen a header yet
    if (!columnMapping) continue
    
    // Parse data row
    const dataPoint = parseDataRowEnhanced(line, columnMapping, duplicateHandling)
    if (dataPoint) {
      currentSegmentData.push(dataPoint)
    }
  }
  
  // Add final segment
  if (currentSegmentData.length > 0) {
    segmentData.push({
      index: segmentCount - 1,
      data: [...currentSegmentData],
      startLine: currentSegmentStartLine,
      rowCount: currentSegmentData.length,
    })
    allDataPoints.push(...currentSegmentData)
  }
  
  return {
    data: allDataPoints,
    columns,
    segments: segmentCount,
    rawHeaders,
    segmentData,
  }
}

/**
 * Count the number of segments (header occurrences) in a CSV file.
 */
export function countSegments(content: string): number {
  const lines = content.split(/\r?\n/)
  let segmentCount = 0
  
  for (const line of lines) {
    if (isHeaderRow(line.trim())) {
      segmentCount++
    }
  }
  
  return segmentCount
}

/**
 * Extract column headers from CSV content without parsing all data.
 * Useful for UI to show available columns before full load.
 */
export function extractColumnHeaders(content: string): ColumnInfo[] {
  const lines = content.split(/\r?\n/)
  
  for (const line of lines) {
    if (isHeaderRow(line.trim())) {
      return parseHeaderRowEnhanced(line).columns
    }
  }
  
  return []
}

/**
 * Get raw header names from CSV content.
 */
export function getRawHeaders(content: string): string[] {
  const lines = content.split(/\r?\n/)
  
  for (const line of lines) {
    if (isHeaderRow(line.trim())) {
      return line.split(',').map(col => col.trim())
    }
  }
  
  return []
}

// ============================================================================
// Types for Parsing Options
// ============================================================================

export type DuplicateHandling = 'first' | 'last' | 'average' | 'both'
export type SegmentMode = 'continuous' | 'separate'

export interface ParseOptions {
  duplicateHandling?: DuplicateHandling
  segmentMode?: SegmentMode
}

// ============================================================================
// Internal Types and Helpers
// ============================================================================

interface ColumnMapping {
  time: number
  pwm: number
  loadCell: number
  thrust: number        // First thrust column (or only)
  thrust2?: number      // Second thrust column (T5X files)
  voltage: number
  current: number
  rpm: number
  efficiency: number
  // Track all column indices for dynamic access
  allColumns: Map<string, number[]>
}

interface HeaderParseResult {
  mapping: ColumnMapping
  columns: ColumnInfo[]
  rawHeaders: string[]
}

/**
 * Check if a line is a CSV header row.
 */
function isHeaderRow(line: string): boolean {
  const lowerLine = line.toLowerCase()
  return lowerLine.includes('time [s]') && lowerLine.includes('pwm value [us]')
}

/**
 * Extract unit from column header.
 * E.g., "Thrust [g]" -> "g", "Time [s]" -> "s"
 */
function extractUnit(header: string): string {
  const match = header.match(/\[([^\]]+)\]/)
  return match ? match[1] : ''
}

/**
 * Create display name from raw header.
 * E.g., "Thrust [g]" -> "Thrust (g)"
 */
function createDisplayName(header: string): string {
  return header.replace(/\[([^\]]+)\]/g, '($1)').trim()
}

/**
 * Parse a header row to determine column positions with full metadata.
 */
function parseHeaderRowEnhanced(line: string): HeaderParseResult {
  const rawHeaders = line.split(',').map(col => col.trim())
  const columns: ColumnInfo[] = []
  const allColumns = new Map<string, number[]>()
  
  const mapping: ColumnMapping = {
    time: -1,
    pwm: -1,
    loadCell: -1,
    thrust: -1,
    voltage: -1,
    current: -1,
    rpm: -1,
    efficiency: -1,
    allColumns,
  }
  
  // Track occurrences for duplicate detection
  const occurrences = new Map<string, number>()
  
  for (let i = 0; i < rawHeaders.length; i++) {
    const rawName = rawHeaders[i]
    const lowerName = rawName.toLowerCase()
    const normalizedName = COLUMN_NAME_MAP[lowerName] || lowerName.replace(/\s*\[.*\]\s*/g, '').replace(/\s+/g, '_')
    
    // Track occurrences
    const prevCount = occurrences.get(lowerName) || 0
    occurrences.set(lowerName, prevCount + 1)
    
    // Track all indices for this column name
    const indices = allColumns.get(normalizedName) || []
    indices.push(i)
    allColumns.set(normalizedName, indices)
    
    const columnInfo: ColumnInfo = {
      index: i,
      rawName,
      normalizedName,
      displayName: createDisplayName(rawName),
      unit: extractUnit(rawName),
      isDuplicate: prevCount > 0,
      duplicateIndex: prevCount,
    }
    columns.push(columnInfo)
    
    // Map to standard fields
    if (lowerName === 'time [s]') {
      mapping.time = i
    } else if (lowerName === 'pwm value [us]') {
      mapping.pwm = i
    } else if (lowerName === 'load cell [g]') {
      mapping.loadCell = i
    } else if (lowerName === 'thrust [g]') {
      if (mapping.thrust === -1) {
        mapping.thrust = i
      } else {
        mapping.thrust2 = i
      }
    } else if (lowerName === 'voltage [v]') {
      mapping.voltage = i
    } else if (lowerName === 'current [a]') {
      mapping.current = i
    } else if (lowerName === 'rpm') {
      mapping.rpm = i
    } else if (lowerName === 'efficiency [g/w]') {
      mapping.efficiency = i
    }
  }
  
  // Mark duplicates retroactively
  occurrences.forEach((count, name) => {
    if (count > 1) {
      columns.forEach(col => {
        if (col.rawName.toLowerCase() === name) {
          col.isDuplicate = true
        }
      })
    }
  })
  
  return { mapping, columns, rawHeaders }
}

/**
 * Parse a data row using the column mapping with duplicate handling options.
 */
function parseDataRowEnhanced(
  line: string, 
  mapping: ColumnMapping,
  duplicateHandling: DuplicateHandling
): ThrusterDataPoint | null {
  const values = line.split(',').map(v => v.trim())
  
  // Ensure we have enough columns
  const maxIndex = Math.max(
    mapping.time,
    mapping.pwm,
    mapping.loadCell,
    mapping.thrust,
    mapping.thrust2 ?? -1,
    mapping.voltage,
    mapping.current,
    mapping.rpm,
    mapping.efficiency
  )
  
  if (values.length <= maxIndex) return null
  
  const time = parseFloat(values[mapping.time])
  const pwm = parseFloat(values[mapping.pwm])
  const loadCell = parseFloat(values[mapping.loadCell])
  const voltage = parseFloat(values[mapping.voltage])
  const current = parseFloat(values[mapping.current])
  const rpm = parseFloat(values[mapping.rpm])
  const efficiency = parseFloat(values[mapping.efficiency])
  
  // Handle thrust column based on duplicate handling mode
  let thrust: number
  const thrust1 = mapping.thrust >= 0 ? parseFloat(values[mapping.thrust]) : NaN
  const thrust2 = mapping.thrust2 !== undefined && mapping.thrust2 >= 0 
    ? parseFloat(values[mapping.thrust2]) 
    : NaN
  
  if (!isNaN(thrust1) && !isNaN(thrust2)) {
    // Both thrust columns exist
    switch (duplicateHandling) {
      case 'first':
        thrust = thrust1
        break
      case 'last':
        thrust = thrust2
        break
      case 'average':
        thrust = (thrust1 + thrust2) / 2
        break
      case 'both':
      default:
        // For 'both', we use the second (filtered) value for the main thrust field
        // The first value would be available as a separate series if needed
        thrust = thrust2
        break
    }
  } else if (!isNaN(thrust1)) {
    thrust = thrust1
  } else if (!isNaN(thrust2)) {
    thrust = thrust2
  } else {
    thrust = 0
  }
  
  // Validate that at least time is valid
  if (isNaN(time)) return null
  
  return {
    time,
    pwm: isNaN(pwm) ? 0 : pwm,
    loadCell: isNaN(loadCell) ? 0 : loadCell,
    thrust: isNaN(thrust) ? 0 : thrust,
    voltage: isNaN(voltage) ? 0 : voltage,
    current: isNaN(current) ? 0 : current,
    rpm: isNaN(rpm) ? 0 : rpm,
    efficiency: isNaN(efficiency) ? 0 : efficiency,
  }
}

/**
 * Generate a unique ID for a test session or run.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// Inspector Data Types
// ============================================================================

export interface InspectorParseResult {
  columns: ColumnInfo[]
  rawRows: string[][]
  rowCount: number
  segmentCount: number
  rawHeaders: string[]
}

/**
 * Parse CSV content for the Data Inspector panel.
 * Returns raw string values for display, along with column metadata.
 */
export function parseCSVForInspector(content: string): InspectorParseResult {
  const lines = content.split(/\r?\n/)
  const rawRows: string[][] = []
  let columns: ColumnInfo[] = []
  let rawHeaders: string[] = []
  let segmentCount = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) continue
    
    // Check if this is a header row
    if (isHeaderRow(line)) {
      const headerResult = parseHeaderRowEnhanced(line)
      columns = headerResult.columns
      rawHeaders = headerResult.rawHeaders
      segmentCount++
      continue
    }
    
    // Skip if we haven't seen a header yet
    if (columns.length === 0) continue
    
    // Store raw string values for display
    const values = line.split(',').map(v => v.trim())
    rawRows.push(values)
  }
  
  return {
    columns,
    rawRows,
    rowCount: rawRows.length,
    segmentCount,
    rawHeaders,
  }
}

// ============================================================================
// Data Transformation Utilities
// ============================================================================

/**
 * Get a specific column's values from data points.
 */
export function getColumnValues(
  data: ThrusterDataPoint[],
  column: keyof ThrusterDataPoint
): number[] {
  return data.map(point => point[column] as number)
}

/**
 * Calculate statistics for a column.
 */
export function calculateColumnStats(values: number[]): {
  min: number
  max: number
  avg: number
  stdDev: number
  count: number
} {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, stdDev: 0, count: 0 }
  }
  
  const count = values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / count
  
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count
  const stdDev = Math.sqrt(variance)
  
  return { min, max, avg, stdDev, count }
}
