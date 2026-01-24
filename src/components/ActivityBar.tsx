import { Database, SlidersHorizontal, LayoutGrid } from 'lucide-react'
import { useAppStore, SidebarView } from '../stores/appStore'

interface ActivityItemProps {
  icon: React.ReactNode
  view: SidebarView
  title: string
}

function ActivityItem({ icon, view, title }: ActivityItemProps) {
  const { activeView, setActiveView } = useAppStore()
  const isActive = activeView === view

  return (
    <button
      onClick={() => setActiveView(view)}
      className={`w-12 h-12 flex items-center justify-center border-l-2 transition-colors ${
        isActive
          ? 'text-vsc-fg border-vsc-fg'
          : 'text-vsc-fg-dim border-transparent hover:text-vsc-fg'
      }`}
      title={title}
    >
      {icon}
    </button>
  )
}

export function ActivityBar() {
  return (
    <div className="w-12 bg-vsc-activitybar flex flex-col border-r border-vsc-border">
      <ActivityItem
        icon={<Database size={24} />}
        view="series"
        title="Data Series"
      />
      <ActivityItem
        icon={<SlidersHorizontal size={24} />}
        view="config"
        title="Graph Settings"
      />
      <ActivityItem
        icon={<LayoutGrid size={24} />}
        view="layout"
        title="View Layout"
      />
    </div>
  )
}
