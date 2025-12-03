import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Material, MATERIALS, MATERIAL_CATEGORIES, OptimizationResult, BoxDimensions } from '../lib/optimizer'

export type SidebarView = 'parameters' | 'materials' | 'info'

export type EndcapConstraint = 'fixed' | 'floating'

export interface ProjectConfig {
  depthM: number
  pressureMpa: number
  useDirectPressure: boolean
  waterDensity: number
  safetyFactor: number
  minDiameterMm: number
  maxDiameterMm: number
  minLengthMm: number
  maxLengthMm: number
  diameterStepMm: number
  lengthStepMm: number
  selectedMaterial: string
  customMaterial: Material | null
  box: BoxDimensions
  // Forced thickness overrides (undefined = auto-calculate)
  forcedWallThicknessMm?: number
  forcedEndcapThicknessMm?: number
  endcapConstraint: EndcapConstraint
}

export interface Project {
  id: string
  name: string
  config: ProjectConfig
  results: OptimizationResult[]
  selectedResultIndex: number | null
  modified: boolean
  filePath?: string
}

export interface SavedProject {
  version: number
  name: string
  config: ProjectConfig
  results: OptimizationResult[]
  selectedResultIndex: number | null
}

const defaultConfig: ProjectConfig = {
  depthM: 30,
  pressureMpa: 0.3,
  useDirectPressure: false,
  waterDensity: 1025,
  safetyFactor: 2.5,
  minDiameterMm: 50,
  maxDiameterMm: 150,
  minLengthMm: 100,
  maxLengthMm: 500,
  diameterStepMm: 5,
  lengthStepMm: 10,
  selectedMaterial: 'ABS',
  customMaterial: null,
  box: {
    widthMm: 100,
    heightMm: 100,
    depthMm: 100,
    enabled: false,
    maxCount: 0,
    orientation: 'all' as const,
    paddingMm: 0
  },
  forcedWallThicknessMm: undefined,
  forcedEndcapThicknessMm: undefined,
  endcapConstraint: 'fixed'
}

function createProject(name: string = 'Untitled'): Project {
  return {
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    config: { ...defaultConfig },
    results: [],
    selectedResultIndex: null,
    modified: false
  }
}

export interface ColumnWidths {
  rank: number
  material: number
  diameter: number
  length: number
  wall: number
  cap: number
  mass: number
  buoyancy: number
  ratio: number
  failDepth: number
  failMode: number
  safety: number
  totalMass: number
  pack: number
  axis: number
  totalBuoy: number
}

interface AppState {
  // Layout
  sidebarVisible: boolean
  sidebarWidth: number
  activeView: SidebarView
  columnWidths: ColumnWidths
  
  // Projects/Tabs
  projects: Project[]
  activeProjectId: string | null
  
  // Recent files
  recentFiles: string[]
  
  // Autosave
  autoSaveEnabled: boolean
  
  // Material selection (for "Compare Selected")
  selectedMaterials: string[]
  
  // Optimization state
  isOptimizing: boolean
  
  // Actions - Layout
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setActiveView: (view: SidebarView) => void
  setColumnWidth: (column: keyof ColumnWidths, width: number) => void
  
  // Actions - Projects/Tabs
  newProject: () => void
  closeProject: (id: string) => void
  setActiveProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  
  // Actions - Current project config
  setDepthM: (depth: number) => void
  setPressureMpa: (pressure: number) => void
  setUseDirectPressure: (use: boolean) => void
  setWaterDensity: (density: number) => void
  setSafetyFactor: (val: number) => void
  setMinDiameterMm: (val: number) => void
  setMaxDiameterMm: (val: number) => void
  setMinLengthMm: (val: number) => void
  setMaxLengthMm: (val: number) => void
  setDiameterStepMm: (val: number) => void
  setLengthStepMm: (val: number) => void
  setSelectedMaterial: (name: string) => void
  setCustomMaterial: (material: Material) => void
  setBoxEnabled: (enabled: boolean) => void
  setBoxWidth: (val: number) => void
  setBoxHeight: (val: number) => void
  setBoxDepth: (val: number) => void
  setBoxMaxCount: (val: number) => void
  setBoxOrientation: (val: 'all' | 'x' | 'y' | 'z') => void
  setBoxForcedDiameter: (val: number | undefined) => void
  setBoxForcedLength: (val: number | undefined) => void
  setBoxPadding: (val: number) => void
  setForcedWallThickness: (val: number | undefined) => void
  setForcedEndcapThickness: (val: number | undefined) => void
  setEndcapConstraint: (val: EndcapConstraint) => void
  
  // Actions - Results
  setResults: (results: OptimizationResult[]) => void
  setSelectedResultIndex: (index: number | null) => void
  setIsOptimizing: (optimizing: boolean) => void
  
  // Getters
  getActiveProject: () => Project | null
  getMaterial: () => Material
  
  // Save/Load
  exportProject: () => SavedProject | null
  importProject: (saved: SavedProject, filePath?: string) => void
  markProjectSaved: (filePath: string) => void
  addRecentFile: (filePath: string) => void
  clearRecentFiles: () => void
  
  // Material selection actions
  toggleMaterialSelection: (materialKey: string) => void
  toggleCategorySelection: (category: string) => void
  selectAllMaterials: () => void
  selectNoMaterials: () => void
  getSelectedMaterialKeys: () => string[]
  
  // Autosave actions
  setAutoSaveEnabled: (enabled: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // Helper to update active project
      const updateActiveProject = (updater: (project: Project) => Partial<Project>) => {
        const { projects, activeProjectId } = get()
        if (!activeProjectId) return
        
        set({
          projects: projects.map(p => 
            p.id === activeProjectId 
              ? { ...p, ...updater(p), modified: true }
              : p
          )
        })
      }

      const initialProject = createProject()
      
      // Default: all materials selected
      const allMaterialKeys = Object.keys(MATERIALS)
      
      return {
        // Initial state
        sidebarVisible: true,
        sidebarWidth: 320,
        activeView: 'parameters',
        columnWidths: {
          rank: 40,
          material: 80,
          diameter: 60,
          length: 60,
          wall: 60,
          cap: 60,
          mass: 70,
          buoyancy: 70,
          ratio: 60,
          failDepth: 70,
          failMode: 90,
          safety: 60,
          totalMass: 80,
          pack: 50,
          axis: 40,
          totalBuoy: 90
        },
        
        projects: [initialProject],
        activeProjectId: initialProject.id,
        
        recentFiles: [],
        
        autoSaveEnabled: true,
        
        selectedMaterials: allMaterialKeys,
        
        isOptimizing: false,
        
        // Actions - Layout
        toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
        setSidebarWidth: (width) => set({ sidebarWidth: Math.max(280, Math.min(500, width)) }),
        setActiveView: (view) => set({ activeView: view, sidebarVisible: true }),
        setColumnWidth: (column, width) => set((s) => ({ 
          columnWidths: { ...s.columnWidths, [column]: Math.max(30, width) } 
        })),
        
        // Actions - Projects/Tabs
        newProject: () => {
          const newProj = createProject()
          set((s) => ({
            projects: [...s.projects, newProj],
            activeProjectId: newProj.id
          }))
        },
        
        closeProject: (id) => {
          const { projects, activeProjectId } = get()
          if (projects.length <= 1) {
            // Don't close last tab, just reset it
            const newProj = createProject()
            set({ projects: [newProj], activeProjectId: newProj.id })
            return
          }
          
          const newProjects = projects.filter(p => p.id !== id)
          const newActiveId = activeProjectId === id 
            ? newProjects[Math.max(0, projects.findIndex(p => p.id === id) - 1)]?.id || newProjects[0].id
            : activeProjectId
            
          set({ projects: newProjects, activeProjectId: newActiveId })
        },
        
        setActiveProject: (id) => set({ activeProjectId: id }),
        
        renameProject: (id, name) => {
          set((s) => ({
            projects: s.projects.map(p => p.id === id ? { ...p, name } : p)
          }))
        },
        
        // Actions - Current project config
        setDepthM: (depth) => updateActiveProject(p => ({ config: { ...p.config, depthM: depth } })),
        setPressureMpa: (pressure) => updateActiveProject(p => ({ config: { ...p.config, pressureMpa: pressure } })),
        setUseDirectPressure: (use) => updateActiveProject(p => ({ config: { ...p.config, useDirectPressure: use } })),
        setWaterDensity: (density) => updateActiveProject(p => ({ config: { ...p.config, waterDensity: density } })),
        setSafetyFactor: (val) => updateActiveProject(p => ({ config: { ...p.config, safetyFactor: val } })),
        setMinDiameterMm: (val) => updateActiveProject(p => ({ config: { ...p.config, minDiameterMm: val } })),
        setMaxDiameterMm: (val) => updateActiveProject(p => ({ config: { ...p.config, maxDiameterMm: val } })),
        setMinLengthMm: (val) => updateActiveProject(p => ({ config: { ...p.config, minLengthMm: val } })),
        setMaxLengthMm: (val) => updateActiveProject(p => ({ config: { ...p.config, maxLengthMm: val } })),
        setDiameterStepMm: (val) => updateActiveProject(p => ({ config: { ...p.config, diameterStepMm: val } })),
        setLengthStepMm: (val) => updateActiveProject(p => ({ config: { ...p.config, lengthStepMm: val } })),
        setSelectedMaterial: (name) => updateActiveProject(p => ({ 
          config: { ...p.config, selectedMaterial: name, customMaterial: null } 
        })),
        setCustomMaterial: (material) => updateActiveProject(p => ({ 
          config: { ...p.config, customMaterial: material } 
        })),
        setBoxEnabled: (enabled) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, enabled } } 
        })),
        setBoxWidth: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, widthMm: Math.min(val, 1000) } } 
        })),
        setBoxHeight: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, heightMm: Math.min(val, 1000) } } 
        })),
        setBoxDepth: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, depthMm: Math.min(val, 1000) } } 
        })),
        setBoxMaxCount: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, maxCount: val } } 
        })),
        setBoxOrientation: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, orientation: val } } 
        })),
        setBoxForcedDiameter: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, forcedDiameterMm: val } } 
        })),
        setBoxForcedLength: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, forcedLengthMm: val } } 
        })),
        setBoxPadding: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, box: { ...defaultConfig.box, ...p.config.box, paddingMm: val } } 
        })),
        setForcedWallThickness: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, forcedWallThicknessMm: val } 
        })),
        setForcedEndcapThickness: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, forcedEndcapThicknessMm: val } 
        })),
        setEndcapConstraint: (val) => updateActiveProject(p => ({ 
          config: { ...p.config, endcapConstraint: val } 
        })),
        
        // Actions - Results
        setResults: (results) => updateActiveProject(() => ({ 
          results, 
          selectedResultIndex: results.length > 0 ? 0 : null 
        })),
        setSelectedResultIndex: (index) => updateActiveProject(() => ({ selectedResultIndex: index })),
        setIsOptimizing: (optimizing) => set({ isOptimizing: optimizing }),
        
        // Getters
        getActiveProject: () => {
          const { projects, activeProjectId } = get()
          return projects.find(p => p.id === activeProjectId) || null
        },
        
        getMaterial: () => {
          const project = get().getActiveProject()
          if (!project) return MATERIALS['ABS']
          if (project.config.customMaterial) {
            return project.config.customMaterial
          }
          return MATERIALS[project.config.selectedMaterial] || MATERIALS['ABS']
        },
        
        // Export current project
        exportProject: () => {
          const project = get().getActiveProject()
          if (!project) return null
          
          return {
            version: 2,
            name: project.name,
            config: project.config,
            results: project.results,
            selectedResultIndex: project.selectedResultIndex
          }
        },
        
        // Import project (creates new tab or updates current)
        importProject: (saved, filePath) => {
          // Use filename from path (not the name stored inside the JSON)
          const fileName = filePath 
            ? filePath.split(/[/\\]/).pop()?.replace(/\.(tube|buoy\.json|json)$/i, '') || saved.name || 'Imported'
            : saved.name || 'Imported'
          
          const newProj: Project = {
            id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: fileName,
            config: { ...defaultConfig, ...saved.config },
            results: saved.results || [],
            selectedResultIndex: saved.selectedResultIndex ?? (saved.results?.length > 0 ? 0 : null),
            modified: false,
            filePath
          }
          
          set((s) => ({
            projects: [...s.projects, newProj],
            activeProjectId: newProj.id
          }))
        },
        
        markProjectSaved: (filePath) => {
          const { projects, activeProjectId, recentFiles } = get()
          // Extract filename without extension for the tab name
          const fileName = filePath.split(/[/\\]/).pop()?.replace(/\.(tube|buoy\.json|json)$/i, '') || 'Untitled'
          
          // Add to recent files (at the start, remove duplicates, limit to 10)
          const newRecentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 10)
          
          set({
            projects: projects.map(p => 
              p.id === activeProjectId 
                ? { ...p, name: fileName, modified: false, filePath }
                : p
            ),
            recentFiles: newRecentFiles
          })
        },
        
        addRecentFile: (filePath) => {
          const { recentFiles } = get()
          const newRecentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 10)
          set({ recentFiles: newRecentFiles })
        },
        
        clearRecentFiles: () => set({ recentFiles: [] }),
        
        // Material selection actions
        toggleMaterialSelection: (materialKey) => {
          const { selectedMaterials } = get()
          if (selectedMaterials.includes(materialKey)) {
            set({ selectedMaterials: selectedMaterials.filter(k => k !== materialKey) })
          } else {
            set({ selectedMaterials: [...selectedMaterials, materialKey] })
          }
        },
        
        toggleCategorySelection: (category) => {
          const { selectedMaterials } = get()
          const categoryMaterials = MATERIAL_CATEGORIES[category as keyof typeof MATERIAL_CATEGORIES] || []
          const allSelected = categoryMaterials.every(m => selectedMaterials.includes(m))
          
          if (allSelected) {
            // Deselect all in category
            set({ selectedMaterials: selectedMaterials.filter(k => !categoryMaterials.includes(k)) })
          } else {
            // Select all in category
            const newSelected = new Set([...selectedMaterials, ...categoryMaterials])
            set({ selectedMaterials: Array.from(newSelected) })
          }
        },
        
        selectAllMaterials: () => set({ selectedMaterials: Object.keys(MATERIALS) }),
        
        selectNoMaterials: () => set({ selectedMaterials: [] }),
        
        getSelectedMaterialKeys: () => get().selectedMaterials,
        
        // Autosave actions
        setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled })
      }
    },
    {
      name: 'tubes-app-storage',
      partialize: (state) => ({
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        activeView: state.activeView,
        columnWidths: state.columnWidths,
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        recentFiles: state.recentFiles,
        selectedMaterials: state.selectedMaterials,
        autoSaveEnabled: state.autoSaveEnabled
      }),
      // Merge persisted state with defaults to handle new fields
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>
        return {
          ...currentState,
          ...persisted,
          // Ensure columnWidths has all fields (for backwards compatibility)
          columnWidths: {
            ...currentState.columnWidths,
            ...(persisted.columnWidths || {})
          }
        }
      }
    }
  )
)

// Convenience hooks for accessing active project data
export function useActiveProject() {
  const project = useAppStore(s => s.getActiveProject())
  return project
}

export function useProjectConfig() {
  const project = useAppStore(s => s.getActiveProject())
  const config = project?.config || defaultConfig
  // Ensure defaults for features added after initial release
  return {
    ...config,
    safetyFactor: config.safetyFactor || defaultConfig.safetyFactor,
    box: config.box || defaultConfig.box,
    endcapConstraint: config.endcapConstraint || defaultConfig.endcapConstraint,
    forcedWallThicknessMm: config.forcedWallThicknessMm,
    forcedEndcapThicknessMm: config.forcedEndcapThicknessMm
  }
}

export function useProjectResults() {
  const project = useAppStore(s => s.getActiveProject())
  return {
    results: project?.results || [],
    selectedResultIndex: project?.selectedResultIndex ?? null
  }
}
