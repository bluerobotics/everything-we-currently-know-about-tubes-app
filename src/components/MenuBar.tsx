import { useState, useRef, useEffect } from 'react'
import { Waves } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

interface MenuItemProps {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
}

function MenuItem({ label, shortcut, onClick, disabled }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
        disabled 
          ? 'text-vsc-fg-muted cursor-not-allowed' 
          : 'text-vsc-fg hover:bg-vsc-selection'
      }`}
    >
      <span className="truncate">{label}</span>
      {shortcut && (
        <span className="text-vsc-fg-muted text-xs ml-6 flex-shrink-0">{shortcut}</span>
      )}
    </button>
  )
}

interface MenuBarProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onExport: () => void
  onToggleSidebar: () => void
  onOpenRecent: (filePath: string) => void
  hasResults: boolean
}

export function MenuBar({ onNew, onOpen, onSave, onExport, onToggleSidebar, onOpenRecent, hasResults }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const { recentFiles, clearRecentFiles } = useAppStore()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenu])

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName)
  }

  const handleItemClick = (action: () => void) => {
    action()
    setOpenMenu(null)
  }

  const getFileName = (filePath: string) => {
    return filePath.split(/[/\\]/).pop() || filePath
  }

  return (
    <div ref={menuBarRef} className="h-[30px] bg-vsc-sidebar-dark flex items-center border-b border-vsc-border flex-shrink-0 select-none">
      {/* Draggable area with logo */}
      <div className="flex items-center h-full titlebar-drag-region pl-3 pr-2">
        <Waves size={18} className="text-vsc-accent" />
      </div>
      
      {/* Menus */}
      <div className="flex items-center h-full titlebar-no-drag">
        {/* File Menu */}
        <div className="relative h-full">
          <button
            onClick={() => handleMenuClick('file')}
            className={`px-3 h-full text-sm transition-colors ${
              openMenu === 'file'
                ? 'bg-vsc-selection text-vsc-fg' 
                : 'text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight'
            }`}
          >
            File
          </button>

          {openMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0.5 min-w-[220px] bg-vsc-dropdown border border-vsc-border rounded shadow-lg z-50">
              <MenuItem label="New Project" shortcut="Ctrl+N" onClick={() => handleItemClick(onNew)} />
              <div className="border-t border-vsc-border my-1" />
              <MenuItem label="Open Project..." shortcut="Ctrl+O" onClick={() => handleItemClick(onOpen)} />
              
              {/* Recent Files Submenu */}
              {recentFiles.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs text-vsc-fg-muted uppercase tracking-wide">Recent</div>
                  {recentFiles.slice(0, 5).map((filePath, i) => (
                    <MenuItem 
                      key={i} 
                      label={getFileName(filePath)} 
                      onClick={() => handleItemClick(() => onOpenRecent(filePath))} 
                    />
                  ))}
                  <MenuItem 
                    label="Clear Recent" 
                    onClick={() => handleItemClick(clearRecentFiles)} 
                  />
                  <div className="border-t border-vsc-border my-1" />
                </>
              )}
              
              <MenuItem label="Save Project..." shortcut="Ctrl+S" onClick={() => handleItemClick(onSave)} />
              <div className="border-t border-vsc-border my-1" />
              <MenuItem 
                label="Export Results as CSV..." 
                shortcut="Ctrl+E" 
                onClick={() => handleItemClick(onExport)} 
                disabled={!hasResults} 
              />
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative h-full">
          <button
            onClick={() => handleMenuClick('view')}
            className={`px-3 h-full text-sm transition-colors ${
              openMenu === 'view'
                ? 'bg-vsc-selection text-vsc-fg' 
                : 'text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight'
            }`}
          >
            View
          </button>

          {openMenu === 'view' && (
            <div className="absolute top-full left-0 mt-0.5 min-w-[200px] bg-vsc-dropdown border border-vsc-border rounded shadow-lg z-50">
              <MenuItem label="Toggle Sidebar" shortcut="Ctrl+B" onClick={() => handleItemClick(onToggleSidebar)} />
            </div>
          )}
        </div>
      </div>
      
      {/* Flexible drag region in the middle */}
      <div className="flex-1 h-full titlebar-drag-region" />
      
      {/* Spacer for native window controls (Windows provides these via titleBarOverlay) */}
      <div className="w-[140px] h-full flex-shrink-0" />
    </div>
  )
}
