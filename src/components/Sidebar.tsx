import { useAppStore } from '../stores/appStore'
import { DataSeriesView } from './sidebar/DataSeriesView'
import { GraphConfigView } from './sidebar/GraphConfigView'
import { LayoutConfigView } from './sidebar/LayoutConfigView'

export function Sidebar() {
  const { 
    activeView, 
    sidebarWidth,
  } = useAppStore()

  const renderView = () => {
    switch (activeView) {
      case 'series':
        return <DataSeriesView />
      case 'config':
        return <GraphConfigView />
      case 'layout':
        return <LayoutConfigView />
      default:
        return <DataSeriesView />
    }
  }

  const getTitle = () => {
    switch (activeView) {
      case 'series':
        return 'DATA SERIES'
      case 'config':
        return 'GRAPH SETTINGS'
      case 'layout':
        return 'VIEW LAYOUT'
      default:
        return ''
    }
  }

  return (
    <div
      className="bg-vsc-sidebar flex flex-col overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      <div className="h-9 flex items-center px-4 text-[11px] font-semibold text-vsc-fg-dim tracking-wide">
        {getTitle()}
      </div>
      <div className="flex-1 overflow-auto">
        {renderView()}
      </div>
    </div>
  )
}
