import { BookOpen, Calculator, AlertTriangle } from 'lucide-react'

export function InfoView() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-2">
        {/* About */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <BookOpen size={14} className="text-vsc-accent" />
            About
          </div>
          <p className="text-sm text-vsc-fg-dim leading-relaxed">
            This tool optimizes cylindrical pressure vessels for maximum buoyancy
            under external hydrostatic pressure. It calculates wall and endcap
            thicknesses using thin/thick wall theory and flat plate equations.
          </p>
        </div>

        {/* Equations */}
        <div className="px-4 py-3 border-t border-vsc-border">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Calculator size={14} className="text-vsc-accent" />
            Equations Used
          </div>
          
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-vsc-fg mb-1">Wall Thickness (Stress)</div>
              <div className="text-vsc-fg-dim font-mono text-xs bg-vsc-bg-dark p-2 rounded">
                sigma = P(Ro^2 + Ri^2) / (Ro^2 - Ri^2)
              </div>
              <div className="text-vsc-fg-muted text-xs mt-1">Thick-wall Lame equation</div>
            </div>
            
            <div>
              <div className="text-vsc-fg mb-1">Wall Thickness (Buckling)</div>
              <div className="text-vsc-fg-dim font-mono text-xs bg-vsc-bg-dark p-2 rounded">
                Pcr = 2E(t/D)^3 / (1-nu^2)
              </div>
              <div className="text-vsc-fg-muted text-xs mt-1">Von Mises buckling criterion</div>
            </div>
            
            <div>
              <div className="text-vsc-fg mb-1">Endcap Thickness (Stress)</div>
              <div className="text-vsc-fg-dim font-mono text-xs bg-vsc-bg-dark p-2 rounded">
                sigma = 3PR^2 / 4t^2
              </div>
              <div className="text-vsc-fg-muted text-xs mt-1">Clamped circular plate</div>
            </div>
            
            <div>
              <div className="text-vsc-fg mb-1">Endcap Thickness (Buckling)</div>
              <div className="text-vsc-fg-dim font-mono text-xs bg-vsc-bg-dark p-2 rounded">
                Pcr = 4.2E(t/R)^3
              </div>
              <div className="text-vsc-fg-muted text-xs mt-1">Flat plate buckling</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="px-4 py-3 border-t border-vsc-border">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <AlertTriangle size={14} className="text-vsc-warning" />
            Important Notes
          </div>
          
          <ul className="text-sm text-vsc-fg-dim space-y-2">
            <li className="flex gap-2">
              <span className="text-vsc-fg-muted">-</span>
              <span>Results use the more conservative of stress and buckling calculations</span>
            </li>
            <li className="flex gap-2">
              <span className="text-vsc-fg-muted">-</span>
              <span>Safety factors are applied to material yield strength</span>
            </li>
            <li className="flex gap-2">
              <span className="text-vsc-fg-muted">-</span>
              <span>Assumes sealing and assembly are handled separately</span>
            </li>
            <li className="flex gap-2">
              <span className="text-vsc-fg-muted">-</span>
              <span>Material properties for plastics can vary with temperature and print orientation</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

