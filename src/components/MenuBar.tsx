import { useState, useRef, useEffect, useCallback } from 'react'
import { Waves, X } from 'lucide-react'

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
      <span className="flex items-center gap-2">
        <span className="truncate">{label}</span>
      </span>
      {shortcut && (
        <span className="text-vsc-fg-muted text-xs ml-6 flex-shrink-0">{shortcut}</span>
      )}
    </button>
  )
}

interface MenuBarProps {
  onNew: () => void
  onOpen: () => void
  onSaveWorkspace: () => void
  onSaveWorkspaceAs: () => void
  onLoadWorkspace: () => void
  onExport: () => void
  onToggleSidebar: () => void
  hasResults: boolean
  currentWorkspacePath?: string | null
}

export function MenuBar({ 
  onNew, 
  onOpen, 
  onSaveWorkspace,
  onSaveWorkspaceAs,
  onLoadWorkspace,
  onExport, 
  onToggleSidebar, 
  hasResults,
  currentWorkspacePath,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  const [showAboutDialog, setShowAboutDialog] = useState(false)

  // Close menu when clicking anywhere except on menu buttons or inside dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // If clicking on a menu button, let the button's onClick handle it
      const clickedButton = target.closest('button')
      if (clickedButton && (clickedButton.textContent === 'File' || clickedButton.textContent === 'View')) {
        return
      }
      
      // If clicking inside the dropdown, don't close
      if (target.closest('.menu-dropdown')) {
        return
      }
      
      // Otherwise close the menu
      setOpenMenu(null)
    }

    if (openMenu) {
      // Use setTimeout to avoid the click that opened the menu from immediately closing it
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClick)
      }, 0)
      
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('click', handleClick)
      }
    }
  }, [openMenu])

  // Close about dialog on escape
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && showAboutDialog) {
      setShowAboutDialog(false)
    }
  }, [showAboutDialog])

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  // When hovering over a different menu button while a menu is open, switch to that menu
  const handleMenuMouseEnter = (menuName: string) => {
    if (openMenu && openMenu !== menuName) {
      setOpenMenu(menuName)
    }
  }

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName)
  }

  const handleItemClick = (action: () => void) => {
    action()
    setOpenMenu(null)
  }

  return (
    <div 
      ref={menuBarRef} 
      className="h-[30px] bg-vsc-sidebar-dark flex items-center border-b border-vsc-border flex-shrink-0 select-none"
    >
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
            onMouseEnter={() => handleMenuMouseEnter('file')}
            className={`px-3 h-full text-sm transition-colors ${
              openMenu === 'file'
                ? 'bg-vsc-selection text-vsc-fg' 
                : 'text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight'
            }`}
          >
            File
          </button>

          {openMenu === 'file' && (
            <div className="menu-dropdown absolute top-full left-0 mt-0.5 min-w-[260px] bg-vsc-dropdown border border-vsc-border rounded shadow-lg z-50">
              <MenuItem label="New Workspace from Folder..." shortcut="Ctrl+O" onClick={() => handleItemClick(onOpen)} />
              <MenuItem label="Open Workspace..." shortcut="Ctrl+Shift+O" onClick={() => handleItemClick(onLoadWorkspace)} />
              <div className="border-t border-vsc-border my-1" />
              <MenuItem 
                label={currentWorkspacePath ? "Save Workspace" : "Save Workspace..."} 
                shortcut="Ctrl+S" 
                onClick={() => handleItemClick(onSaveWorkspace)} 
              />
              <MenuItem 
                label="Save Workspace As..." 
                shortcut="Ctrl+Shift+S" 
                onClick={() => handleItemClick(onSaveWorkspaceAs)} 
              />
              {currentWorkspacePath && (
                <div className="px-3 py-1 text-xs text-vsc-fg-muted truncate" title={currentWorkspacePath}>
                  {currentWorkspacePath.split(/[/\\]/).pop()}
                </div>
              )}
              <div className="border-t border-vsc-border my-1" />
              <MenuItem label="Clear Workspace" shortcut="Ctrl+N" onClick={() => handleItemClick(onNew)} />
              <div className="border-t border-vsc-border my-1" />
              <MenuItem 
                label="Export Chart as PNG..." 
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
            onMouseEnter={() => handleMenuMouseEnter('view')}
            className={`px-3 h-full text-sm transition-colors ${
              openMenu === 'view'
                ? 'bg-vsc-selection text-vsc-fg' 
                : 'text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight'
            }`}
          >
            View
          </button>

          {openMenu === 'view' && (
            <div className="menu-dropdown absolute top-full left-0 mt-0.5 min-w-[200px] bg-vsc-dropdown border border-vsc-border rounded shadow-lg z-50">
              <MenuItem label="Toggle Sidebar" shortcut="Ctrl+B" onClick={() => handleItemClick(onToggleSidebar)} />
            </div>
          )}
        </div>

        {/* About Menu */}
        <div className="relative h-full">
          <button
            onClick={() => setShowAboutDialog(true)}
            className="px-3 h-full text-sm transition-colors text-vsc-fg-dim hover:text-vsc-fg hover:bg-vsc-highlight"
          >
            About
          </button>
        </div>
      </div>
      
      {/* Flexible drag region in the middle */}
      <div className="flex-1 h-full titlebar-drag-region" />
      
      {/* Spacer for native window controls */}
      <div className="w-[140px] h-full flex-shrink-0" />

      {/* About Dialog */}
      {showAboutDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAboutDialog(false)}
        >
          <div 
            className="bg-vsc-sidebar border border-vsc-border rounded-lg shadow-xl w-[400px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-vsc-border">
              <div className="flex items-center gap-2">
                <Waves size={20} className="text-vsc-accent" />
                <span className="text-sm font-medium">About Thruster Viewer</span>
              </div>
              <button
                onClick={() => setShowAboutDialog(false)}
                className="text-vsc-fg-dim hover:text-vsc-fg p-1 rounded hover:bg-vsc-highlight"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-vsc-fg-dim leading-relaxed">
                A tool for visualizing and analyzing test data. Load CSV files from test runs 
                to compare results across different configurations.
              </p>
              <div className="text-xs text-vsc-fg-muted">
                Version 1.0.0
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
