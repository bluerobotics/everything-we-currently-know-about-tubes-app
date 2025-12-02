import { useAppStore, useProjectResults, useProjectConfig } from '../stores/appStore'

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
  const { results, selectedResultIndex } = useProjectResults()
  const config = useProjectConfig()
  const { getMaterial } = useAppStore()

  if (results.length === 0 || selectedResultIndex === null) {
    return (
      <div className="h-32 border-t border-vsc-border bg-vsc-panel p-3 flex-shrink-0 flex items-center justify-center">
        <p className="text-vsc-fg-dim text-sm">Select a result to view details</p>
      </div>
    )
  }

  const r = results[selectedResultIndex]
  const material = getMaterial()
  const showPacking = config.box?.enabled && r.packingCount !== undefined
  const showMaterial = config.selectedMaterial === 'ALL' && r.materialName

  return (
    <div className="h-32 border-t border-vsc-border bg-vsc-panel overflow-hidden flex-shrink-0">
      <div className="px-3 py-2">
        {/* Material name banner when comparing all */}
        {showMaterial && (
          <div className="text-xs font-medium text-vsc-accent mb-1">
            {r.materialName}
          </div>
        )}
        <div className={`grid gap-4 ${showPacking ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {/* Dimensions */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              Dimensions
            </h3>
            <div className="space-y-0">
              <DetailRow label="Outer Dia" value={r.diameterMm} unit="mm" />
              <DetailRow label="Inner Dia" value={r.innerDiameterMm} unit="mm" />
              <DetailRow label="Length" value={r.lengthMm} unit="mm" />
              <DetailRow label="Wall / Cap" value={`${r.wallThicknessMm.toFixed(1)} / ${r.endcapThicknessMm.toFixed(1)}`} unit="mm" />
            </div>
          </div>

          {/* Volume */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              Volume
            </h3>
            <div className="space-y-0">
              <DetailRow label="Outer" value={r.outerVolumeL} unit="L" />
              <DetailRow label="Inner" value={r.innerVolumeL} unit="L" />
              <DetailRow label="Material" value={r.materialVolumeL} unit="L" />
            </div>
          </div>

          {/* Mass */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              Mass
            </h3>
            <div className="space-y-0">
              <DetailRow label="Cylinder" value={r.massKg * 1000} unit="g" />
              <DetailRow label="Displaced" value={r.displacedWaterKg * 1000} unit="g" />
            </div>
          </div>

          {/* Buoyancy */}
          <div>
            <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
              Buoyancy
            </h3>
            <div className="space-y-0">
              <DetailRow label="Net" value={r.netBuoyancyKg * 1000} unit="g" />
              <DetailRow label="Force" value={r.netBuoyancyN} unit="N" />
              <DetailRow label="Ratio" value={r.buoyancyRatio} unit=":1" />
              <DetailRow label="Method" value={r.wallMethod} />
            </div>
          </div>

          {/* Packing (when enabled) */}
          {showPacking && (
            <div>
              <h3 className="text-xs font-semibold text-vsc-accent mb-1 uppercase tracking-wide">
                Packing
              </h3>
              <div className="space-y-0">
                <DetailRow label="Count" value={r.packingCount || 0} unit="cyl" />
                <DetailRow label="Axis" value={r.packingOrientation?.toUpperCase() || '-'} />
                <DetailRow label="Total Mass" value={(r.totalMassKg || 0) * 1000} unit="g" />
                <DetailRow label="Total Buoy" value={(r.totalBuoyancyKg || 0) * 1000} unit="g" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
