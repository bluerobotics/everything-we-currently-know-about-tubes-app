import { useState, useRef, useEffect } from 'react'
import { Waves, ChevronRight, Check } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

interface MenuItemProps {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  checked?: boolean
}

function MenuItem({ label, shortcut, onClick, disabled, checked }: MenuItemProps) {
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
        {checked !== undefined && (
          <span className="w-4">{checked && <Check size={14} />}</span>
        )}
        <span className="truncate">{label}</span>
      </span>
      {shortcut && (
        <span className="text-vsc-fg-muted text-xs ml-6 flex-shrink-0">{shortcut}</span>
      )}
    </button>
  )
}

interface SubMenuItemProps {
  label: string
  children: React.ReactNode
  disabled?: boolean
}

function SubMenuItem({ label, children, disabled }: SubMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  
  const handleMouseEnter = () => {
    if (disabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }
  
  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => setIsOpen(false), 150)
  }
  
  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
          disabled 
            ? 'text-vsc-fg-muted cursor-not-allowed' 
            : 'text-vsc-fg hover:bg-vsc-selection'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronRight size={14} className="text-vsc-fg-muted" />
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute left-full top-0 ml-0.5 min-w-[200px] bg-vsc-dropdown border border-vsc-border rounded shadow-lg z-50">
          {children}
        </div>
      )}
    </div>
  )
}

interface MenuBarProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExport: () => void
  onToggleSidebar: () => void
  onOpenRecent: (filePath: string) => void
  hasResults: boolean
}

export function MenuBar({ onNew, onOpen, onSave, onSaveAs, onExport, onToggleSidebar, onOpenRecent, hasResults }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const { recentFiles, clearRecentFiles, autoSaveEnabled, setAutoSaveEnabled } = useAppStore()

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

  const getFileName = (filePath: string) => {
    return filePath.split(/[/\\]/).pop() || filePath
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
            <div className="menu-dropdown absolute top-full left-0 mt-0.5 min-w-[220px] bg-vsc-dropdown border border-vsc-border rounded shadow-lg z-50">
              <MenuItem label="New Project" shortcut="Ctrl+N" onClick={() => handleItemClick(onNew)} />
              <div className="border-t border-vsc-border my-1" />
              <MenuItem label="Open Project..." shortcut="Ctrl+O" onClick={() => handleItemClick(onOpen)} />
              
              {/* Recent Files Submenu */}
              <SubMenuItem label="Open Recent" disabled={recentFiles.length === 0}>
                {recentFiles.slice(0, 10).map((filePath, i) => (
                  <MenuItem 
                    key={i} 
                    label={getFileName(filePath)} 
                    onClick={() => handleItemClick(() => onOpenRecent(filePath))} 
                  />
                ))}
                {recentFiles.length > 0 && (
                  <>
                    <div className="border-t border-vsc-border my-1" />
                    <MenuItem 
                      label="Clear Recent Files" 
                      onClick={() => handleItemClick(clearRecentFiles)} 
                    />
                  </>
                )}
              </SubMenuItem>
              
              <div className="border-t border-vsc-border my-1" />
              <MenuItem label="Save Project" shortcut="Ctrl+S" onClick={() => handleItemClick(onSave)} />
              <MenuItem label="Save As..." shortcut="Ctrl+Shift+S" onClick={() => handleItemClick(onSaveAs)} />
              <MenuItem 
                label="Autosave" 
                checked={autoSaveEnabled}
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} 
              />
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
      </div>
      
      {/* Flexible drag region in the middle */}
      <div className="flex-1 h-full titlebar-drag-region" />
      
      {/* Spacer for native window controls */}
      <div className="w-[140px] h-full flex-shrink-0" />
    </div>
  )
}
