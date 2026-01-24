import { useSelectedRunsStats, Y_AXIS_LABELS, useActiveTab, useAppStore } from '../stores/appStore'
import { Save, RefreshCw, Check } from 'lucide-react'

/**
 * Format a timestamp as a relative time string (e.g., "2s ago", "1m ago")
 */
function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return ''
  
  const now = Date.now()
  const diff = Math.floor((now - timestamp) / 1000) // seconds
  
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function StatusBar() {
  const activeTab = useActiveTab()
  const stats = useSelectedRunsStats()
  
  // Autosave state
  const autosaveEnabled = useAppStore(state => state.autosaveEnabled)
  const isSaving = useAppStore(state => state.isSaving)
  const lastSaveTime = useAppStore(state => state.lastSaveTime)
  const setAutosaveEnabled = useAppStore(state => state.setAutosaveEnabled)
  
  const testSessions = activeTab?.testSessions || []
  const selectedRunIds = activeTab?.selectedRunIds || []
  const isLoading = activeTab?.isLoading || false
  const yAxisMetric = activeTab?.chartConfig.yAxis.column || 'thrust'
  const hasWorkspacePath = !!activeTab?.workspacePath

  const totalRuns = testSessions.reduce((acc, s) => acc + s.runs.length, 0)
  const metricLabel = Y_AXIS_LABELS[yAxisMetric]

  return (
    <div className="h-6 bg-vsc-bg-darker border-t border-vsc-border flex items-center justify-between px-3 text-xs text-vsc-fg-dim select-none flex-shrink-0">
      <div className="flex items-center gap-4">
        <span>{testSessions.length} session{testSessions.length !== 1 ? 's' : ''}</span>
        <span>{selectedRunIds.length}/{totalRuns} runs selected</span>
      </div>
      <div className="flex items-center gap-4">
        {isLoading ? (
          <span>Loading...</span>
        ) : stats ? (
          <>
            <span>{stats.totalPoints.toLocaleString()} points</span>
            <span>{metricLabel}</span>
          </>
        ) : (
          <span>No data loaded</span>
        )}
        
        {/* Autosave indicator - only show when workspace has been saved */}
        {hasWorkspacePath && (
          <div className="flex items-center gap-1.5 border-l border-vsc-border pl-3">
            {isSaving ? (
              <span className="flex items-center gap-1 text-vsc-fg-muted">
                <RefreshCw size={12} className="animate-spin" />
                Saving...
              </span>
            ) : lastSaveTime ? (
              <span className="flex items-center gap-1 text-vsc-fg-dim" title={`Last saved: ${new Date(lastSaveTime).toLocaleTimeString()}`}>
                <Check size={12} className="text-green-500" />
                Saved {formatRelativeTime(lastSaveTime)}
              </span>
            ) : null}
            
            {/* Autosave toggle */}
            <button
              onClick={() => setAutosaveEnabled(!autosaveEnabled)}
              className={`ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                autosaveEnabled 
                  ? 'text-vsc-fg hover:bg-vsc-highlight' 
                  : 'text-vsc-fg-muted hover:bg-vsc-highlight'
              }`}
              title={autosaveEnabled ? 'Autosave enabled - click to disable' : 'Autosave disabled - click to enable'}
            >
              <Save size={12} />
              <span className="text-[10px]">{autosaveEnabled ? 'Auto' : 'Manual'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
