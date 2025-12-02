import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { useAppStore, useProjectConfig, useProjectResults, SavedProject } from './stores/appStore'
import { optimize, depthToPressure } from './lib/optimizer'
import { MenuBar } from './components/MenuBar'
import { TabBar } from './components/TabBar'
import { ActivityBar } from './components/ActivityBar'
import { Sidebar } from './components/Sidebar'
import { ResultsTable } from './components/ResultsTable'
import { DetailsPanel } from './components/DetailsPanel'
import { StatusBar } from './components/StatusBar'
import { CylinderViewer } from './components/CylinderViewer'

function App() {
  const {
    sidebarVisible,
    sidebarWidth,
    setSidebarWidth,
    toggleSidebar,
    getMaterial,
    setResults,
    isOptimizing,
    setIsOptimizing,
    exportProject,
    importProject,
    markProjectSaved,
    getActiveProject,
    newProject,
    addRecentFile,
    getSelectedMaterialKeys
  } = useAppStore()
  
  const config = useProjectConfig()
  const { results } = useProjectResults()

  const [isResizing, setIsResizing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [viewerWidth, setViewerWidth] = useState(450) // Default wider viewer

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX - 48 // Account for activity bar
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, setSidebarWidth])

  // Save config handler
  const handleSaveConfig = async () => {
    const projectData = exportProject()
    if (!projectData) return
    
    if (!window.electronAPI) {
      // Fallback for browser - download as file
      const fileName = `${projectData.name.replace(/[^a-z0-9]/gi, '-')}.buoy.json`
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      markProjectSaved(fileName)
      setStatusMessage('Project downloaded')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    const result = await window.electronAPI.saveConfig(JSON.stringify(projectData, null, 2))
    if (result.success && result.filePath) {
      markProjectSaved(result.filePath)
      setStatusMessage(`Saved to ${result.filePath}`)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  // Load config handler
  const handleLoadConfig = async () => {
    if (!window.electronAPI) {
      // Fallback for browser - use file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,.buoy.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const text = await file.text()
          try {
            const saved = JSON.parse(text) as SavedProject
            importProject(saved)
            setStatusMessage('Project loaded')
            setTimeout(() => setStatusMessage(''), 3000)
          } catch {
            setStatusMessage('Error: Invalid project file')
            setTimeout(() => setStatusMessage(''), 3000)
          }
        }
      }
      input.click()
      return
    }

    const result = await window.electronAPI.loadConfig()
    if (result.success && result.data && result.filePath) {
      try {
        const saved = JSON.parse(result.data) as SavedProject
        importProject(saved, result.filePath)
        addRecentFile(result.filePath)
        setStatusMessage(`Loaded from ${result.filePath}`)
        setTimeout(() => setStatusMessage(''), 3000)
      } catch {
        setStatusMessage('Error: Invalid project file')
        setTimeout(() => setStatusMessage(''), 3000)
      }
    }
  }

  // Open recent file handler
  const handleOpenRecent = async (filePath: string) => {
    if (!window.electronAPI) {
      setStatusMessage('Recent files only available in Electron')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    const result = await window.electronAPI.loadRecentFile(filePath)
    if (result.success && result.data) {
      try {
        const saved = JSON.parse(result.data) as SavedProject
        importProject(saved, filePath)
        addRecentFile(filePath)
        setStatusMessage(`Loaded from ${filePath}`)
        setTimeout(() => setStatusMessage(''), 3000)
      } catch {
        setStatusMessage('Error: Invalid project file')
        setTimeout(() => setStatusMessage(''), 3000)
      }
    } else if (result.error) {
      setStatusMessage(`Error: ${result.error}`)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  // Export results handler
  const handleExportResults = async () => {
    const project = getActiveProject()
    if (!project || project.results.length === 0) {
      setStatusMessage('No results to export')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    // Create CSV content
    const headers = ['Rank', 'Diameter (mm)', 'Length (mm)', 'Wall (mm)', 'Endcap (mm)', 
                     'Mass (g)', 'Buoyancy (g)', 'Ratio', 'Method']
    const rows = project.results.map(r => [
      r.rank,
      r.diameterMm.toFixed(1),
      r.lengthMm.toFixed(1),
      r.wallThicknessMm.toFixed(2),
      r.endcapThicknessMm.toFixed(2),
      (r.massKg * 1000).toFixed(1),
      (r.netBuoyancyKg * 1000).toFixed(1),
      r.buoyancyRatio.toFixed(2),
      r.wallMethod
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    if (!window.electronAPI) {
      // Fallback for browser
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'buoyancy-results.csv'
      a.click()
      URL.revokeObjectURL(url)
      setStatusMessage('Results downloaded')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    const result = await window.electronAPI.exportResults(csv)
    if (result.success) {
      setStatusMessage(`Exported to ${result.filePath}`)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  // Listen for menu events
  useEffect(() => {
    if (!window.electronAPI) return

    const cleanup = window.electronAPI.onMenuEvent((event) => {
      switch (event) {
        case 'menu:toggle-sidebar':
          toggleSidebar()
          break
        case 'menu:save-config':
          handleSaveConfig()
          break
        case 'menu:load-config':
          handleLoadConfig()
          break
        case 'menu:export':
          handleExportResults()
          break
      }
    })

    return cleanup
  }, [toggleSidebar])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault()
            newProject()
            break
          case 'o':
            e.preventDefault()
            handleLoadConfig()
            break
          case 's':
            e.preventDefault()
            handleSaveConfig()
            break
          case 'e':
            e.preventDefault()
            handleExportResults()
            break
          case 'b':
            e.preventDefault()
            toggleSidebar()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, results])

  // Run optimization
  const runOptimization = () => {
    setIsOptimizing(true)
    setStatusMessage(config.selectedMaterial === 'ALL' ? 'Comparing all materials...' : 'Running optimization...')

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const pressure = config.useDirectPressure
        ? config.pressureMpa
        : depthToPressure(config.depthM, config.waterDensity)

      const optimizationResults = optimize({
        pressureMpa: pressure,
        material: getMaterial(),
        materialKey: config.selectedMaterial,
        selectedMaterials: getSelectedMaterialKeys(),
        safetyFactor: config.safetyFactor,
        minDiameterMm: config.minDiameterMm,
        maxDiameterMm: config.maxDiameterMm,
        minLengthMm: config.minLengthMm,
        maxLengthMm: config.maxLengthMm,
        diameterStepMm: config.diameterStepMm,
        lengthStepMm: config.lengthStepMm,
        waterDensity: config.waterDensity,
        box: config.box
      })

      const selectedCount = getSelectedMaterialKeys().length
      setResults(optimizationResults)
      setIsOptimizing(false)
      setStatusMessage(`Found ${optimizationResults.length} results${config.selectedMaterial === 'ALL' ? ` across ${selectedCount} materials` : ''}`)
      setTimeout(() => setStatusMessage(''), 3000)
    }, 50)
  }

  return (
    <div className="h-screen flex flex-col bg-vsc-bg overflow-hidden">
      <MenuBar
        onNew={newProject}
        onOpen={handleLoadConfig}
        onSave={handleSaveConfig}
        onExport={handleExportResults}
        onToggleSidebar={toggleSidebar}
        onOpenRecent={handleOpenRecent}
        hasResults={results.length > 0}
      />
      <TabBar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <ActivityBar />

        {sidebarVisible && (
          <>
            <Sidebar />
            <div
              className="w-1 bg-vsc-border hover:bg-vsc-accent cursor-col-resize transition-colors flex-shrink-0"
              onMouseDown={() => setIsResizing(true)}
            />
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="h-10 bg-vsc-bg-dark border-b border-vsc-border flex items-center justify-between px-4 flex-shrink-0">
            <div className="text-sm text-vsc-fg-dim">
              {statusMessage || 'Optimize cylinder dimensions for maximum buoyancy'}
            </div>
            <button
              onClick={runOptimization}
              disabled={isOptimizing}
              className="flex items-center gap-2 px-4 py-1.5 bg-vsc-accent hover:bg-vsc-accent-hover disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
            >
              <Play size={14} />
              {isOptimizing ? 'Running...' : 'Run Optimization'}
            </button>
          </div>

          {/* Content area with results and 3D view */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left: Results table */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <ResultsTable />
            </div>

            {/* Right: 3D Viewer */}
            <div 
              className="border-l border-vsc-border flex-shrink-0"
              style={{ width: viewerWidth }}
            >
              <CylinderViewer 
                width={viewerWidth}
                onWidthChange={setViewerWidth}
              />
            </div>
          </div>

          {/* Details panel */}
          <DetailsPanel />
        </div>
      </div>

      <StatusBar />
    </div>
  )
}

export default App
