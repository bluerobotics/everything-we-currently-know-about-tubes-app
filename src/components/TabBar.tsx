import { Plus, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export function TabBar() {
  const { projects, activeProjectId, setActiveProject, closeProject, newProject } = useAppStore()

  return (
    <div className="h-9 bg-vsc-bg-darker flex items-center border-b border-vsc-border overflow-x-auto">
      <div className="flex items-center h-full">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => setActiveProject(project.id)}
            className={`group flex items-center gap-2 h-full px-3 border-r border-vsc-border cursor-pointer transition-colors ${
              project.id === activeProjectId
                ? 'bg-vsc-bg text-vsc-fg'
                : 'bg-vsc-bg-darker text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-bg-dark'
            }`}
          >
            <span className="text-sm truncate max-w-[150px]">
              {project.name}
              {project.modified && <span className="text-vsc-warning ml-1">*</span>}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeProject(project.id)
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-vsc-highlight rounded p-0.5 transition-opacity"
              title="Close tab"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      
      <button
        onClick={newProject}
        className="flex items-center justify-center w-8 h-8 text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight rounded mx-1 transition-colors"
        title="New project"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

