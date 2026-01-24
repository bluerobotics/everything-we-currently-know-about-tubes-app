import { Plus, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, switchTab } = useAppStore()

  // Get display name for a tab
  const getTabName = (tab: typeof tabs[0]) => {
    if (tab.workspacePath) {
      const filename = tab.workspacePath.split(/[/\\]/).filter(Boolean).pop() || 'Untitled'
      return filename.replace(/\.thruster$/, '')
    }
    return 'Untitled'
  }

  // Handle creating a new workspace tab
  const handleNewTab = () => {
    addTab()
  }

  // Handle closing a tab
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation() // Don't trigger tab switch
    closeTab(tabId)
  }

  // Handle switching tabs
  const handleSwitchTab = (tabId: string) => {
    switchTab(tabId)
  }

  return (
    <div className="h-9 bg-vsc-bg-darker flex items-center border-b border-vsc-border overflow-x-auto">
      <div className="flex items-center h-full">
        {/* Render all tabs */}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const tabName = getTabName(tab)
          
          return (
            <div
              key={tab.id}
              onClick={() => handleSwitchTab(tab.id)}
              className={`group flex items-center gap-2 h-full px-3 border-r border-vsc-border cursor-pointer transition-colors ${
                isActive 
                  ? 'bg-vsc-bg text-vsc-fg' 
                  : 'bg-vsc-bg-darker text-vsc-fg-dim hover:bg-vsc-bg hover:text-vsc-fg'
              }`}
            >
              <span 
                className="text-sm truncate max-w-[200px]" 
                title={tab.workspacePath || 'Untitled workspace'}
              >
                {tabName}
              </span>
              
              {/* Close button - only show if more than one tab */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className={`p-0.5 rounded transition-colors ${
                    isActive
                      ? 'text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-border'
                      : 'text-vsc-fg-dim opacity-0 group-hover:opacity-100 hover:text-vsc-fg hover:bg-vsc-border'
                  }`}
                  title="Close tab"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )
        })}

        {/* New tab button */}
        <button
          onClick={handleNewTab}
          className="flex items-center justify-center h-full px-2 text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-bg transition-colors"
          title="New workspace tab"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
