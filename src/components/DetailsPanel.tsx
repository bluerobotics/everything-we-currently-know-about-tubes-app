import { useAppStore, useSelectedRunsStats, useChartData, useActiveTab, Y_AXIS_LABELS } from '../stores/appStore'

function DetailRow({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex justify-between py-0.5 text-xs">
      <span className="text-vsc-fg-dim">{label}</span>
      <span className="font-mono">
        {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 1) : value}
        {unit && <span className="text-vsc-fg-muted ml-1">{unit}</span>}
      </span>
    </div>
  )
}

export function DetailsPanel() {
  const { hoveredDataPoint } = useAppStore()
  const activeTab = useActiveTab()
  const stats = useSelectedRunsStats()
  const chartData = useChartData()
  
  const selectedRunIds = activeTab?.selectedRunIds || []
  const testSessions = activeTab?.testSessions || []
  const yAxisMetric = activeTab?.chartConfig.yAxis.column || 'thrust'

  // Get current metric label
  const metricLabel = Y_AXIS_LABELS[yAxisMetric]
  const metricUnit = metricLabel.match(/\(([^)]+)\)/)?.[1] || ''

  // No data loaded
  if (testSessions.length === 0) {
    return (
      <div className="h-28 border-t border-vsc-border bg-vsc-panel p-3 flex-shrink-0 flex items-center justify-center">
        <p className="text-vsc-fg-dim text-sm">Load a data folder to view test runs</p>
      </div>
    )
  }

  // Data loaded but no selection
  if (selectedRunIds.length === 0) {
    return (
      <div className="h-28 border-t border-vsc-border bg-vsc-panel p-3 flex-shrink-0 flex items-center justify-center">
        <p className="text-vsc-fg-dim text-sm">Select test runs from the browser to view data</p>
      </div>
    )
  }

  return (
    <div className="h-28 border-t border-vsc-border bg-vsc-panel overflow-hidden flex-shrink-0">
      <div className="px-3 py-2">
        <div className="grid grid-cols-4 gap-4">
          {/* Selection Info */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              Selection
            </h3>
            <div className="space-y-0">
              <DetailRow label="Selected runs" value={selectedRunIds.length} />
              <DetailRow label="Loaded runs" value={stats?.loadedCount || 0} />
              <DetailRow label="Total points" value={stats?.totalPoints || 0} />
            </div>
          </div>

          {/* Current Metric Stats */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              {metricLabel.split(' (')[0]}
            </h3>
            <div className="space-y-0">
              <DetailRow label="Min" value={stats?.min ?? '-'} unit={metricUnit} />
              <DetailRow label="Max" value={stats?.max ?? '-'} unit={metricUnit} />
              <DetailRow label="Average" value={stats?.avg ?? '-'} unit={metricUnit} />
            </div>
          </div>

          {/* Hovered Point */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              Cursor
            </h3>
            {hoveredDataPoint ? (
              <div className="space-y-0">
                <DetailRow label="Time" value={hoveredDataPoint.time} unit="s" />
                <DetailRow label="PWM" value={hoveredDataPoint.pwm} unit="μs" />
                <DetailRow label={metricLabel.split(' (')[0]} value={hoveredDataPoint[yAxisMetric]} unit={metricUnit} />
              </div>
            ) : (
              <div className="text-xs text-vsc-fg-muted py-1">
                Hover over chart to see values
              </div>
            )}
          </div>

          {/* Selected Runs */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              Runs
            </h3>
            <div className="space-y-0.5 max-h-16 overflow-y-auto">
              {chartData.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center gap-1.5 text-xs">
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: run.color }} 
                  />
                  <span className="text-vsc-fg truncate">{run.name}</span>
                </div>
              ))}
              {chartData.length > 5 && (
                <div className="text-xs text-vsc-fg-muted">
                  +{chartData.length - 5} more
                </div>
              )}
              {chartData.length === 0 && selectedRunIds.length > 0 && (
                <div className="text-xs text-vsc-fg-muted">
                  Loading data...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
