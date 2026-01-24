import { useEffect, useState, useCallback } from 'react'
import { FolderOpen, RotateCcw, FileUp } from 'lucide-react'
import { useAppStore, useChartData, useActiveTab } from './stores/appStore'
import { MenuBar } from './components/MenuBar'
import { TabBar } from './components/TabBar'
import { ActivityBar } from './components/ActivityBar'
import { Sidebar } from './components/Sidebar'
import { ViewLayoutPanel } from './components/ViewLayoutPanel'
import { DetailsPanel } from './components/DetailsPanel'
import { StatusBar } from './components/StatusBar'
import { DataInspectorPanel, type InspectorData } from './components/DataInspectorPanel'
import { parseCSVForInspector } from './lib/thrusterData'

function App() {
  const {
    sidebarVisible,
    setSidebarWidth,
    toggleSidebar,
    selectAndLoadDataFolder,
    loadDataFolder,
    clearData,
    getRunById,
    // Workspace
    lastWorkspacePath,
    saveWorkspace,
    saveWorkspaceAs,
    loadWorkspace,
    loadWorkspaceFromPath,
  } = useAppStore()
  
  // Get active tab data
  const activeTab = useActiveTab()
  const dataFolderPath = activeTab?.dataFolderPath || null
  const isLoading = activeTab?.isLoading || false
  const loadError = activeTab?.loadError || null
  const testSessions = activeTab?.testSessions || []
  const inspectedRunId = activeTab?.inspectedRunId || null
  const inspectorPanelVisible = activeTab?.inspectorPanelVisible || false
  const currentWorkspacePath = activeTab?.workspacePath || null
  
  const chartData = useChartData()

  const [isResizing, setIsResizing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  
  // Inspector data state
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null)
  const [isInspectorLoading, setIsInspectorLoading] = useState(false)

  // Auto-load last workspace on startup (with hydration check)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [hasTriedAutoLoad, setHasTriedAutoLoad] = useState(false)
  
  useEffect(() => {
    // Wait a tick for Zustand to hydrate from localStorage
    const timer = setTimeout(() => {
      setHasHydrated(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])
  
  // Auto-load last workspace or folder
  useEffect(() => {
    if (hasHydrated && !hasTriedAutoLoad && !isLoading && window.electronAPI) {
      setHasTriedAutoLoad(true)
      
      // Try to load last workspace first
      if (lastWorkspacePath) {
        setStatusMessage('Loading last workspace...')
        loadWorkspaceFromPath(lastWorkspacePath).then(success => {
          if (success) {
            setStatusMessage('Workspace loaded')
            setTimeout(() => setStatusMessage(''), 2000)
          } else {
            // Fall back to loading just the data folder with restored selections
            if (dataFolderPath && testSessions.length === 0) {
              setStatusMessage('Restoring last session...')
              loadDataFolder(dataFolderPath, { restoreSelections: true })
            }
          }
        })
      } else if (dataFolderPath && testSessions.length === 0) {
        // No workspace, but we have a folder path - restore selections from hydrated state
        setStatusMessage('Restoring last session...')
        loadDataFolder(dataFolderPath, { restoreSelections: true })
      }
    }
  }, [hasHydrated, hasTriedAutoLoad, lastWorkspacePath, dataFolderPath, testSessions.length, isLoading, loadDataFolder, loadWorkspaceFromPath])

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

  // Load data folder handler
  const handleOpenFolder = useCallback(async () => {
    setStatusMessage('Opening folder...')
    await selectAndLoadDataFolder()
    setStatusMessage('')
  }, [selectAndLoadDataFolder])

  // Reload last folder
  const handleReloadFolder = useCallback(async () => {
    if (dataFolderPath) {
      setStatusMessage('Reloading data...')
      clearData()
      await loadDataFolder(dataFolderPath)
      setStatusMessage('')
    }
  }, [dataFolderPath, clearData, loadDataFolder])

  // Stub handlers for menu bar compatibility
  const handleNew = useCallback(() => {
    clearData()
    setStatusMessage('Cleared all data')
    setTimeout(() => setStatusMessage(''), 2000)
  }, [clearData])

  // Workspace handlers
  const handleSaveWorkspace = useCallback(async () => {
    setStatusMessage('Saving workspace...')
    const success = await saveWorkspace()
    if (success) {
      setStatusMessage('Workspace saved')
    } else {
      setStatusMessage('Failed to save workspace')
    }
    setTimeout(() => setStatusMessage(''), 2000)
  }, [saveWorkspace])

  const handleSaveWorkspaceAs = useCallback(async () => {
    setStatusMessage('Saving workspace...')
    const success = await saveWorkspaceAs()
    if (success) {
      setStatusMessage('Workspace saved')
    } else {
      setStatusMessage('Save cancelled')
    }
    setTimeout(() => setStatusMessage(''), 2000)
  }, [saveWorkspaceAs])

  const handleLoadWorkspace = useCallback(async () => {
    setStatusMessage('Loading workspace...')
    const success = await loadWorkspace()
    if (success) {
      setStatusMessage('Workspace loaded')
    } else {
      setStatusMessage('Load cancelled')
    }
    setTimeout(() => setStatusMessage(''), 2000)
  }, [loadWorkspace])

  const handleExport = useCallback(() => {
    // TODO: Could implement chart export here
    setStatusMessage('Export not yet implemented')
    setTimeout(() => setStatusMessage(''), 2000)
  }, [])

  // Listen for menu events
  useEffect(() => {
    if (!window.electronAPI) return

    const cleanup = window.electronAPI.onMenuEvent((event) => {
      switch (event) {
        case 'menu:toggle-sidebar':
          toggleSidebar()
          break
        case 'menu:load-config':
          handleOpenFolder()
          break
      }
    })

    return cleanup
  }, [toggleSidebar, handleOpenFolder])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Shift combinations
        if (e.shiftKey) {
          switch (e.key.toLowerCase()) {
            case 's':
              e.preventDefault()
              handleSaveWorkspaceAs()
              break
            case 'o':
              e.preventDefault()
              handleLoadWorkspace()
              break
          }
          return
        }
        
        // Ctrl only combinations
        switch (e.key.toLowerCase()) {
          case 'o':
            e.preventDefault()
            handleOpenFolder()
            break
          case 'b':
            e.preventDefault()
            toggleSidebar()
            break
          case 'r':
            e.preventDefault()
            handleReloadFolder()
            break
          case 's':
            e.preventDefault()
            handleSaveWorkspace()
            break
        }
      }
      
      // Graph config shortcuts (no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const { setDisplayConfig, setShowPoints, setSmoothLines, getActiveTab } = useAppStore.getState()
        const activeTabData = getActiveTab()
        if (!activeTabData) return
        
        const { chartConfig } = activeTabData
        const { display } = chartConfig
        switch (e.key.toLowerCase()) {
          case 'g':
            if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
              const newShowGrid = !(display.showGridX && display.showGridY)
              setDisplayConfig({ showGridX: newShowGrid, showGridY: newShowGrid })
            }
            break
          case 'p':
            if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
              // Toggle points for all series
              const hasPoints = Object.values(chartConfig.seriesConfigs).some(s => s.showPoints)
              setShowPoints(!hasPoints)
            }
            break
          case 's':
            if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
              e.preventDefault()
              // Toggle smooth lines for all series
              const hasSmooth = Object.values(chartConfig.seriesConfigs).some(s => s.interpolation === 'spline')
              setSmoothLines(!hasSmooth)
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, handleOpenFolder, handleReloadFolder, handleSaveWorkspace, handleSaveWorkspaceAs, handleLoadWorkspace])

  // Update status when loading
  useEffect(() => {
    if (isLoading) {
      setStatusMessage('Loading data...')
    } else if (loadError) {
      setStatusMessage(`Error: ${loadError}`)
      setTimeout(() => setStatusMessage(''), 5000)
    } else if (testSessions.length > 0) {
      const totalRuns = testSessions.reduce((acc, s) => acc + s.runs.length, 0)
      setStatusMessage(`Loaded ${testSessions.length} session(s) with ${totalRuns} runs`)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }, [isLoading, loadError, testSessions.length])

  // Load inspector data when inspected run changes
  useEffect(() => {
    if (!inspectedRunId) {
      setInspectorData(null)
      return
    }

    const run = getRunById(inspectedRunId)
    if (!run) {
      setInspectorData(null)
      return
    }

    // Load CSV content for inspection
    const loadInspectorData = async () => {
      if (!window.electronAPI) return
      
      setIsInspectorLoading(true)
      try {
        const result = await window.electronAPI.readCSV(run.filePath)
        if (result.success && result.content) {
          const data = parseCSVForInspector(result.content)
          setInspectorData(data)
        }
      } catch (error) {
        console.error('Failed to load inspector data:', error)
        setInspectorData(null)
      } finally {
        setIsInspectorLoading(false)
      }
    }

    loadInspectorData()
  }, [inspectedRunId, getRunById])

  return (
    <div className="h-screen flex flex-col bg-vsc-bg overflow-hidden">
      <MenuBar
        onNew={handleNew}
        onOpen={handleOpenFolder}
        onSaveWorkspace={handleSaveWorkspace}
        onSaveWorkspaceAs={handleSaveWorkspaceAs}
        onLoadWorkspace={handleLoadWorkspace}
        onExport={handleExport}
        onToggleSidebar={toggleSidebar}
        hasResults={chartData.length > 0}
        currentWorkspacePath={currentWorkspacePath}
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
              {statusMessage || (dataFolderPath ? `Folder: ${dataFolderPath}` : 'Thruster Viewer')}
            </div>
            <div className="flex items-center gap-2">
              {dataFolderPath && (
                <button
                  onClick={handleReloadFolder}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border text-vsc-fg rounded text-sm transition-colors disabled:opacity-50"
                  title="Reload folder (Ctrl+R)"
                >
                  <RotateCcw size={14} />
                  Reload
                </button>
              )}
              <button
                onClick={handleLoadWorkspace}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-1.5 bg-vsc-input hover:bg-vsc-border-light border border-vsc-border text-vsc-fg rounded text-sm transition-colors disabled:opacity-50"
                title="Open existing workspace (Ctrl+Shift+O)"
              >
                <FileUp size={14} />
                Open Workspace
              </button>
              <button
                onClick={handleOpenFolder}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-1.5 bg-vsc-accent hover:bg-vsc-accent-hover disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
                title="Create new workspace from folder (Ctrl+O)"
              >
                <FolderOpen size={14} />
                {isLoading ? 'Loading...' : 'New from Folder'}
              </button>
            </div>
          </div>

          {/* Content area with chart */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <ViewLayoutPanel />
            </div>
            
            {/* Data Inspector Panel */}
            {inspectorPanelVisible && (
              <DataInspectorPanel
                inspectorData={inspectorData}
                isLoading={isInspectorLoading}
              />
            )}
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
