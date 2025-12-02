import { useAppStore, useProjectResults, useProjectConfig } from '../stores/appStore'

export function StatusBar() {
  const { results } = useProjectResults()
  const config = useProjectConfig()
  const { getMaterial, isOptimizing } = useAppStore()
  const material = getMaterial()

  return (
    <div className="h-6 bg-vsc-bg-darker border-t border-vsc-border flex items-center justify-between px-3 text-xs text-vsc-fg-dim select-none flex-shrink-0">
      <div className="flex items-center gap-4">
        <span>{material.name}</span>
        <span>{config.pressureMpa.toFixed(3)} MPa</span>
      </div>
      <div className="flex items-center gap-4">
        {isOptimizing ? (
          <span>Optimizing...</span>
        ) : (
          <span>{results.length} results</span>
        )}
      </div>
    </div>
  )
}
