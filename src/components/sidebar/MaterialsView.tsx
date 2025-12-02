import { Box, Edit2, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { useState } from 'react'
import { useAppStore, useProjectConfig } from '../../stores/appStore'
import { MATERIALS, MATERIAL_CATEGORIES, Material } from '../../lib/optimizer'

function PropertyRow({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-vsc-fg-dim text-sm">{label}</span>
      <span className="text-vsc-fg font-mono text-sm">
        {typeof value === 'number' ? value.toFixed(value < 1 ? 2 : 0) : value} {unit}
      </span>
    </div>
  )
}

function EditableProperty({
  label,
  value,
  onChange,
  unit,
  step = 1
}: {
  label: string
  value: number
  onChange: (val: number) => void
  unit: string
  step?: number
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-vsc-fg-dim text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          className="w-20 text-right py-1 px-2 text-sm"
        />
        <span className="text-vsc-fg-muted text-xs w-12">{unit}</span>
      </div>
    </div>
  )
}

function MaterialCheckbox({ 
  checked, 
  onChange,
  indeterminate = false 
}: { 
  checked: boolean
  onChange: () => void
  indeterminate?: boolean
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
        checked 
          ? 'bg-vsc-accent border-vsc-accent' 
          : indeterminate
            ? 'bg-vsc-accent/50 border-vsc-accent'
            : 'border-vsc-border hover:border-vsc-fg-dim'
      }`}
    >
      {checked && <Check size={12} className="text-white" />}
      {indeterminate && !checked && <div className="w-2 h-0.5 bg-white" />}
    </button>
  )
}

export function MaterialsView() {
  const config = useProjectConfig()
  const { 
    setSelectedMaterial, 
    setCustomMaterial, 
    getMaterial,
    selectedMaterials,
    toggleMaterialSelection,
    toggleCategorySelection,
    selectAllMaterials,
    selectNoMaterials
  } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editMaterial, setEditMaterial] = useState<Material | null>(null)

  const currentMaterial = getMaterial()
  const selectedCount = selectedMaterials.length

  const handleMaterialSelect = (name: string) => {
    setSelectedMaterial(name)
    setIsEditing(false)
  }

  const handleEditStart = () => {
    setEditMaterial({ ...currentMaterial })
    setIsEditing(true)
  }

  const handleEditSave = () => {
    if (editMaterial) {
      setCustomMaterial(editMaterial)
    }
    setIsEditing(false)
  }

  const handleEditCancel = () => {
    setEditMaterial(null)
    setIsEditing(false)
  }

  const updateEditMaterial = (key: keyof Material, value: number | string) => {
    if (editMaterial) {
      setEditMaterial({ ...editMaterial, [key]: value })
    }
  }

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Unfilled Plastics': true // Default expanded
  })

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  // Check if all materials in a category are selected
  const getCategorySelectionState = (category: string) => {
    const categoryMaterials = MATERIAL_CATEGORIES[category as keyof typeof MATERIAL_CATEGORIES] || []
    const selectedInCategory = categoryMaterials.filter(m => selectedMaterials.includes(m))
    if (selectedInCategory.length === 0) return 'none'
    if (selectedInCategory.length === categoryMaterials.length) return 'all'
    return 'partial'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto py-2">
        {/* Material Selector */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-4">
            <Box size={14} className="text-vsc-accent" />
            Select Material
          </div>
          
          <div className="space-y-1">
            {/* Compare Selected Materials option */}
            <button
              onClick={() => handleMaterialSelect('ALL')}
              disabled={selectedCount === 0}
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                config.selectedMaterial === 'ALL' && !config.customMaterial
                  ? 'bg-vsc-accent text-white'
                  : selectedCount === 0
                    ? 'text-vsc-fg-muted cursor-not-allowed'
                    : 'text-vsc-accent hover:bg-vsc-highlight'
              }`}
            >
              ⚡ Compare Selected ({selectedCount})
            </button>
            
            {/* Select All / Select None buttons */}
            <div className="flex gap-2 px-1 py-1">
              <button
                onClick={selectAllMaterials}
                className="text-xs text-vsc-fg-dim hover:text-vsc-accent"
              >
                Select All
              </button>
              <span className="text-vsc-fg-muted">|</span>
              <button
                onClick={selectNoMaterials}
                className="text-xs text-vsc-fg-dim hover:text-vsc-accent"
              >
                Select None
              </button>
            </div>
            
            <div className="border-t border-vsc-border my-2" />
            
            {Object.entries(MATERIAL_CATEGORIES).map(([category, materials]) => {
              const selectionState = getCategorySelectionState(category)
              return (
                <div key={category} className="mb-1">
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <MaterialCheckbox
                      checked={selectionState === 'all'}
                      indeterminate={selectionState === 'partial'}
                      onChange={() => toggleCategorySelection(category)}
                    />
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex-1 flex items-center gap-1 text-xs font-medium text-vsc-fg-dim hover:text-vsc-fg uppercase tracking-wide"
                    >
                      {expandedCategories[category] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {category}
                      <span className="text-vsc-fg-muted ml-1">
                        ({materials.filter(m => selectedMaterials.includes(m)).length}/{materials.length})
                      </span>
                    </button>
                  </div>
                  {expandedCategories[category] && (
                    <div className="ml-2 space-y-0.5">
                      {materials.map((name) => {
                        const isSelected = selectedMaterials.includes(name)
                        const isActiveMaterial = config.selectedMaterial === name && !config.customMaterial
                        return (
                          <div
                            key={name}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                              isActiveMaterial
                                ? 'bg-vsc-selection text-vsc-fg'
                                : 'text-vsc-fg-dim hover:bg-vsc-highlight hover:text-vsc-fg'
                            }`}
                          >
                            <MaterialCheckbox
                              checked={isSelected}
                              onChange={() => toggleMaterialSelection(name)}
                            />
                            <button
                              onClick={() => handleMaterialSelect(name)}
                              className="flex-1 text-left"
                            >
                              {MATERIALS[name]?.name || name}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {config.customMaterial && (
              <button
                className="w-full text-left px-3 py-2 rounded text-sm bg-vsc-selection text-vsc-fg"
              >
                Custom ({config.customMaterial.name})
              </button>
            )}
          </div>
        </div>

        {/* Material Properties */}
        {config.selectedMaterial !== 'ALL' && (
          <div className="px-4 py-3 border-t border-vsc-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Edit2 size={14} className="text-vsc-accent" />
                Properties
              </div>
              {!isEditing ? (
                <button
                  onClick={handleEditStart}
                  className="text-xs text-vsc-accent hover:text-vsc-accent-hover"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleEditSave}
                    className="text-xs text-vsc-success hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="text-xs text-vsc-fg-dim hover:text-vsc-fg"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="space-y-1">
                <PropertyRow label="Density" value={currentMaterial.density} unit="kg/m³" />
                <PropertyRow label="Yield Strength" value={currentMaterial.yieldStrength} unit="MPa" />
                <PropertyRow label="Elastic Modulus" value={currentMaterial.elasticModulus} unit="MPa" />
                <PropertyRow label="Poisson's Ratio" value={currentMaterial.poissonsRatio} unit="" />
              </div>
            ) : editMaterial && (
              <div className="space-y-2">
                <EditableProperty
                  label="Density"
                  value={editMaterial.density}
                  onChange={(v) => updateEditMaterial('density', v)}
                  unit="kg/m³"
                />
                <EditableProperty
                  label="Yield Strength"
                  value={editMaterial.yieldStrength}
                  onChange={(v) => updateEditMaterial('yieldStrength', v)}
                  unit="MPa"
                />
                <EditableProperty
                  label="Elastic Modulus"
                  value={editMaterial.elasticModulus}
                  onChange={(v) => updateEditMaterial('elasticModulus', v)}
                  unit="MPa"
                />
                <EditableProperty
                  label="Poisson's Ratio"
                  value={editMaterial.poissonsRatio}
                  onChange={(v) => updateEditMaterial('poissonsRatio', v)}
                  unit=""
                  step={0.01}
                />
              </div>
            )}
          </div>
        )}
        
        {config.selectedMaterial === 'ALL' && (
          <div className="px-4 py-3 border-t border-vsc-border">
            <div className="text-xs text-vsc-fg-dim">
              Optimization will compare {selectedCount} selected materials and show the best results across all of them.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
