import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAppStore, useProjectResults, useProjectConfig, ColumnWidths } from '../stores/appStore'
import { ChevronUp, ChevronDown, Filter, X } from 'lucide-react'

type SortKey = 'rank' | 'material' | 'diameter' | 'length' | 'wall' | 'cap' | 'mass' | 'buoyancy' | 'ratio' | 'pack' | 'totalMass' | 'totalBuoy'
type SortDir = 'asc' | 'desc'
type ColumnKey = keyof ColumnWidths

interface FilterState {
  material?: string
  minDiameter?: number
  maxDiameter?: number
  minLength?: number
  maxLength?: number
  minWall?: number
  maxWall?: number
  minCap?: number
  maxCap?: number
  minMass?: number
  maxMass?: number
  minBuoyancy?: number
  maxBuoyancy?: number
  minRatio?: number
  maxRatio?: number
  minPack?: number
  maxPack?: number
  minTotalMass?: number
  maxTotalMass?: number
  minTotalBuoy?: number
  maxTotalBuoy?: number
}

export function ResultsTable() {
  const { results, selectedResultIndex } = useProjectResults()
  const { setSelectedResultIndex, columnWidths, setColumnWidth } = useAppStore()
  const config = useProjectConfig()
  
  const showPacking = config.box?.enabled && results.length > 0 && results[0].packingCount !== undefined
  const showMaterial = config.selectedMaterial === 'ALL' && results.length > 0
  
  // Default sort: by totalBuoy (desc) when packing enabled, otherwise by rank (asc)
  const [sortKey, setSortKey] = useState<SortKey>(showPacking ? 'totalBuoy' : 'rank')
  const [sortDir, setSortDir] = useState<SortDir>(showPacking ? 'desc' : 'asc')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})
  
  // Column resizing state
  const [resizing, setResizing] = useState<ColumnKey | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)
  
  const handleResizeStart = useCallback((e: React.MouseEvent, column: ColumnKey) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(column)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = columnWidths[column]
  }, [columnWidths])
  
  useEffect(() => {
    if (!resizing) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current
      const newWidth = resizeStartWidth.current + delta
      setColumnWidth(resizing, newWidth)
    }
    
    const handleMouseUp = () => {
      setResizing(null)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizing, setColumnWidth])
  
  // Update default sort when packing mode changes
  useEffect(() => {
    if (showPacking) {
      setSortKey('totalBuoy')
      setSortDir('desc')
    } else {
      setSortKey('rank')
      setSortDir('asc')
    }
  }, [showPacking])

  // Filter and sort results
  const filteredSortedResults = useMemo(() => {
    let filtered = results.filter(r => {
      // Material filter
      if (filters.material && r.materialKey && !r.materialKey.toLowerCase().includes(filters.material.toLowerCase())) return false
      
      // Diameter filters
      if (filters.minDiameter && r.diameterMm < filters.minDiameter) return false
      if (filters.maxDiameter && r.diameterMm > filters.maxDiameter) return false
      
      // Length filters
      if (filters.minLength && r.lengthMm < filters.minLength) return false
      if (filters.maxLength && r.lengthMm > filters.maxLength) return false
      
      // Wall filters
      if (filters.minWall && r.wallThicknessMm < filters.minWall) return false
      if (filters.maxWall && r.wallThicknessMm > filters.maxWall) return false
      
      // Cap filters
      if (filters.minCap && r.endcapThicknessMm < filters.minCap) return false
      if (filters.maxCap && r.endcapThicknessMm > filters.maxCap) return false
      
      // Mass filters (in grams for UI)
      if (filters.minMass && r.massKg * 1000 < filters.minMass) return false
      if (filters.maxMass && r.massKg * 1000 > filters.maxMass) return false
      
      // Buoyancy filters (in grams for UI)
      if (filters.minBuoyancy && r.netBuoyancyKg * 1000 < filters.minBuoyancy) return false
      if (filters.maxBuoyancy && r.netBuoyancyKg * 1000 > filters.maxBuoyancy) return false
      
      // Ratio filters
      if (filters.minRatio && r.buoyancyRatio < filters.minRatio) return false
      if (filters.maxRatio && r.buoyancyRatio > filters.maxRatio) return false
      
      // Packing filters
      if (filters.minPack && (r.packingCount || 0) < filters.minPack) return false
      if (filters.maxPack && (r.packingCount || 0) > filters.maxPack) return false
      
      // Total mass filters (in grams)
      if (filters.minTotalMass && (r.totalMassKg || 0) * 1000 < filters.minTotalMass) return false
      if (filters.maxTotalMass && (r.totalMassKg || 0) * 1000 > filters.maxTotalMass) return false
      
      // Total buoyancy filters (in grams)
      if (filters.minTotalBuoy && (r.totalBuoyancyKg || 0) * 1000 < filters.minTotalBuoy) return false
      if (filters.maxTotalBuoy && (r.totalBuoyancyKg || 0) * 1000 > filters.maxTotalBuoy) return false
      
      return true
    })

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'material') {
        const aVal = a.materialKey || ''
        const bVal = b.materialKey || ''
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      let aVal: number, bVal: number
      switch (sortKey) {
        case 'rank': aVal = a.rank; bVal = b.rank; break
        case 'diameter': aVal = a.diameterMm; bVal = b.diameterMm; break
        case 'length': aVal = a.lengthMm; bVal = b.lengthMm; break
        case 'wall': aVal = a.wallThicknessMm; bVal = b.wallThicknessMm; break
        case 'cap': aVal = a.endcapThicknessMm; bVal = b.endcapThicknessMm; break
        case 'mass': aVal = a.massKg; bVal = b.massKg; break
        case 'buoyancy': aVal = a.netBuoyancyKg; bVal = b.netBuoyancyKg; break
        case 'ratio': aVal = a.buoyancyRatio; bVal = b.buoyancyRatio; break
        case 'pack': aVal = a.packingCount || 0; bVal = b.packingCount || 0; break
        case 'totalMass': aVal = a.totalMassKg || 0; bVal = b.totalMassKg || 0; break
        case 'totalBuoy': aVal = a.totalBuoyancyKg || 0; bVal = b.totalBuoyancyKg || 0; break
        default: aVal = a.rank; bVal = b.rank
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

    return sorted
  }, [results, sortKey, sortDir, filters])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortHeader = ({ label, sortKeyName, columnKey }: { label: string; sortKeyName: SortKey; columnKey: ColumnKey }) => (
    <th 
      onClick={() => handleSort(sortKeyName)}
      className="cursor-pointer hover:bg-vsc-highlight select-none relative group"
      style={{ width: columnWidths[columnKey], minWidth: columnWidths[columnKey] }}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        )}
      </div>
      <div 
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-vsc-accent opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, columnKey)}
      />
    </th>
  )

  const clearFilters = () => {
    setFilters({})
  }

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  // Helper for filter inputs
  const FilterInput = ({ 
    filterKey, 
    placeholder,
    width = 'w-16'
  }: { 
    filterKey: keyof FilterState
    placeholder: string
    width?: string
  }) => (
    <input
      type="number"
      placeholder={placeholder}
      value={filters[filterKey] ?? ''}
      onChange={e => setFilters(f => ({ 
        ...f, 
        [filterKey]: e.target.value ? Number(e.target.value) : undefined 
      }))}
      className={`${width} px-1 py-0.5 bg-vsc-input border border-vsc-border rounded text-[10px]`}
    />
  )

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-vsc-fg-dim">
        <div className="text-center">
          <p className="text-lg mb-2">No results yet</p>
          <p className="text-sm">Configure parameters and click "Run Optimization"</p>
        </div>
      </div>
    )
  }

  const formatMass = (kg: number) => {
    if (kg >= 1) return `${kg.toFixed(2)}kg`
    return `${(kg * 1000).toFixed(0)}g`
  }

  // Calculate min/max for conditional formatting
  const { minPack, maxPack, minTotalBuoy, maxTotalBuoy } = useMemo(() => {
    if (!showPacking || filteredSortedResults.length === 0) {
      return { minPack: 0, maxPack: 1, minTotalBuoy: 0, maxTotalBuoy: 1 }
    }
    
    const packs = filteredSortedResults.map(r => r.packingCount || 0)
    const buoys = filteredSortedResults.map(r => r.totalBuoyancyKg || 0)
    
    return {
      minPack: Math.min(...packs),
      maxPack: Math.max(...packs),
      minTotalBuoy: Math.min(...buoys),
      maxTotalBuoy: Math.max(...buoys)
    }
  }, [filteredSortedResults, showPacking])

  // Get color for conditional formatting (0 = red, 1 = green)
  const getGradientColor = (value: number, min: number, max: number, invert: boolean = false) => {
    if (max === min) return 'inherit'
    
    let ratio = (value - min) / (max - min)
    if (invert) ratio = 1 - ratio
    
    // Interpolate from red (0) through yellow (0.5) to green (1)
    const r = ratio < 0.5 ? 255 : Math.round(255 * (1 - ratio) * 2)
    const g = ratio > 0.5 ? 255 : Math.round(255 * ratio * 2)
    const b = 50
    
    return `rgb(${r}, ${g}, ${b})`
  }

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filteredSortedResults.length === 0) return
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      
      // Find current position in filtered results
      const currentResult = selectedResultIndex !== null ? results[selectedResultIndex] : null
      const currentFilteredIndex = currentResult 
        ? filteredSortedResults.findIndex(r => r === currentResult)
        : -1
      
      let newFilteredIndex: number
      if (e.key === 'ArrowDown') {
        newFilteredIndex = currentFilteredIndex < filteredSortedResults.length - 1 
          ? currentFilteredIndex + 1 
          : 0
      } else {
        newFilteredIndex = currentFilteredIndex > 0 
          ? currentFilteredIndex - 1 
          : filteredSortedResults.length - 1
      }
      
      // Find the original index of the new selection
      const newResult = filteredSortedResults[newFilteredIndex]
      const originalIndex = results.findIndex(r => r === newResult)
      setSelectedResultIndex(originalIndex)
    }
  }, [filteredSortedResults, selectedResultIndex, results, setSelectedResultIndex])

  // Ref for the table container to scroll selected row into view
  const tableContainerRef = useRef<HTMLDivElement>(null)
  
  // Scroll selected row into view when selection changes via keyboard
  useEffect(() => {
    if (selectedResultIndex === null || !tableContainerRef.current) return
    
    const selectedRow = tableContainerRef.current.querySelector('tr.selected')
    if (selectedRow) {
      selectedRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedResultIndex])

  return (
    <div 
      className="flex-1 flex flex-col overflow-hidden outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-vsc-border bg-vsc-bg-dark text-xs">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            showFilters || hasFilters
              ? 'bg-vsc-accent/20 text-vsc-accent'
              : 'text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight'
          }`}
        >
          <Filter size={12} />
          Filter
          {hasFilters && <span className="text-vsc-warning">*</span>}
        </button>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 rounded text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight"
          >
            <X size={12} />
            Clear
          </button>
        )}
        <span className="text-vsc-fg-muted ml-auto">
          {filteredSortedResults.length} of {results.length} results
        </span>
      </div>

      {/* Table with inline filter row */}
      <div className="flex-1 overflow-auto" ref={tableContainerRef}>
        <table className="results-table">
          <thead>
            <tr>
              <SortHeader label="#" sortKeyName="rank" columnKey="rank" />
              {showMaterial && <SortHeader label="Material" sortKeyName="material" columnKey="material" />}
              <SortHeader label="Dia" sortKeyName="diameter" columnKey="diameter" />
              <SortHeader label="Len" sortKeyName="length" columnKey="length" />
              <SortHeader label="Wall" sortKeyName="wall" columnKey="wall" />
              <SortHeader label="Cap" sortKeyName="cap" columnKey="cap" />
              <SortHeader label="Mass" sortKeyName="mass" columnKey="mass" />
              <SortHeader label="Buoy" sortKeyName="buoyancy" columnKey="buoyancy" />
              <SortHeader label="Ratio" sortKeyName="ratio" columnKey="ratio" />
              {showPacking && (
                <>
                  <SortHeader label="Tot.Mass" sortKeyName="totalMass" columnKey="totalMass" />
                  <th 
                    onClick={() => handleSort('pack')}
                    className="cursor-pointer hover:bg-vsc-highlight select-none relative group"
                    style={{ width: columnWidths.pack, minWidth: columnWidths.pack }}
                  >
                    <div className="flex items-center gap-1">
                      Pack
                      {sortKey === 'pack' && (
                        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-vsc-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart(e, 'pack')}
                    />
                  </th>
                  <th 
                    className="cursor-default relative group"
                    style={{ width: columnWidths.axis, minWidth: columnWidths.axis }}
                  >
                    Axis
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-vsc-accent opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart(e, 'axis')}
                    />
                  </th>
                  <SortHeader label="Tot.Buoy" sortKeyName="totalBuoy" columnKey="totalBuoy" />
                </>
              )}
            </tr>
            {/* Filter row */}
            {showFilters && (
              <tr className="bg-vsc-panel text-[10px]">
                <th></th>
                {showMaterial && (
                  <th className="px-1 py-1">
                    <input
                      type="text"
                      placeholder="filter"
                      value={filters.material || ''}
                      onChange={e => setFilters(f => ({ ...f, material: e.target.value || undefined }))}
                      className="w-14 px-1 py-0.5 bg-vsc-input border border-vsc-border rounded text-[10px]"
                    />
                  </th>
                )}
                <th className="px-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <FilterInput filterKey="minDiameter" placeholder="min" />
                    <FilterInput filterKey="maxDiameter" placeholder="max" />
                  </div>
                </th>
                <th className="px-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <FilterInput filterKey="minLength" placeholder="min" />
                    <FilterInput filterKey="maxLength" placeholder="max" />
                  </div>
                </th>
                <th className="px-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <FilterInput filterKey="minWall" placeholder="min" />
                    <FilterInput filterKey="maxWall" placeholder="max" />
                  </div>
                </th>
                <th className="px-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <FilterInput filterKey="minCap" placeholder="min" />
                    <FilterInput filterKey="maxCap" placeholder="max" />
                  </div>
                </th>
                <th className="px-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <FilterInput filterKey="minMass" placeholder="min g" />
                    <FilterInput filterKey="maxMass" placeholder="max g" />
                  </div>
                </th>
                <th className="px-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <FilterInput filterKey="minBuoyancy" placeholder="min g" />
                    <FilterInput filterKey="maxBuoyancy" placeholder="max g" />
                  </div>
                </th>
                <th className="px-1 py-1">
                  <div className="flex flex-col gap-0.5">
                    <FilterInput filterKey="minRatio" placeholder="min" />
                    <FilterInput filterKey="maxRatio" placeholder="max" />
                  </div>
                </th>
                {showPacking && (
                  <>
                    <th className="px-1 py-1">
                      <div className="flex flex-col gap-0.5">
                        <FilterInput filterKey="minTotalMass" placeholder="min g" />
                        <FilterInput filterKey="maxTotalMass" placeholder="max g" />
                      </div>
                    </th>
                    <th className="px-1 py-1 w-px">
                      <div className="flex flex-col gap-0.5">
                        <FilterInput filterKey="minPack" placeholder="min" width="w-12" />
                        <FilterInput filterKey="maxPack" placeholder="max" width="w-12" />
                      </div>
                    </th>
                    <th className="w-px"></th>
                    <th className="px-1 py-1">
                      <div className="flex flex-col gap-0.5">
                        <FilterInput filterKey="minTotalBuoy" placeholder="min g" />
                        <FilterInput filterKey="maxTotalBuoy" placeholder="max g" />
                      </div>
                    </th>
                  </>
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {filteredSortedResults.map((r) => {
              const originalIndex = results.findIndex(orig => orig === r)
              
              return (
                <tr
                  key={originalIndex}
                  onClick={() => setSelectedResultIndex(originalIndex)}
                  className={`cursor-pointer ${selectedResultIndex === originalIndex ? 'selected' : ''}`}
                >
                  <td className="text-vsc-fg-muted">{r.rank}</td>
                  {showMaterial && (
                    <td className="text-vsc-fg" title={r.materialName}>
                      {r.materialKey}
                    </td>
                  )}
                  <td>{r.diameterMm.toFixed(1)}</td>
                  <td>{r.lengthMm.toFixed(1)}</td>
                  <td>{r.wallThicknessMm.toFixed(2)}</td>
                  <td>{r.endcapThicknessMm.toFixed(2)}</td>
                  <td>{(r.massKg * 1000).toFixed(0)}g</td>
                  <td className="text-vsc-success">{(r.netBuoyancyKg * 1000).toFixed(0)}g</td>
                  <td>{r.buoyancyRatio.toFixed(2)}</td>
                  {showPacking && (
                    <>
                      <td>{formatMass(r.totalMassKg || 0)}</td>
                      <td 
                        className="font-medium whitespace-nowrap"
                        style={{ color: getGradientColor(r.packingCount || 0, minPack, maxPack, true) }}
                      >
                        {r.packingCount}
                      </td>
                      <td 
                        className="font-bold text-center whitespace-nowrap"
                        style={{ 
                          color: r.packingOrientation === 'x' ? '#339af0' 
                               : r.packingOrientation === 'y' ? '#20c997' 
                               : '#b197fc' 
                        }}
                      >
                        {r.packingOrientation?.toUpperCase()}
                      </td>
                      <td 
                        className="font-medium"
                        style={{ color: getGradientColor(r.totalBuoyancyKg || 0, minTotalBuoy, maxTotalBuoy, false) }}
                      >
                        {formatMass(r.totalBuoyancyKg || 0)}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
