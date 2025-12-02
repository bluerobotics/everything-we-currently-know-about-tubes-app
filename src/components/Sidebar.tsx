import { useAppStore } from '../stores/appStore'
import { ParametersView } from './sidebar/ParametersView'
import { MaterialsView } from './sidebar/MaterialsView'
import { InfoView } from './sidebar/InfoView'

export function Sidebar() {
  const { activeView, sidebarWidth } = useAppStore()

  const renderView = () => {
    switch (activeView) {
      case 'parameters':
        return <ParametersView />
      case 'materials':
        return <MaterialsView />
      case 'info':
        return <InfoView />
      default:
        return <ParametersView />
    }
  }

  const getTitle = () => {
    switch (activeView) {
      case 'parameters':
        return 'OPTIMIZATION PARAMETERS'
      case 'materials':
        return 'MATERIAL PROPERTIES'
      case 'info':
        return 'INFORMATION'
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

