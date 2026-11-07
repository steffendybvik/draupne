import {
  BuildingLibraryIcon, CalendarDaysIcon, ChartBarIcon, ChartPieIcon, Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import {
  BuildingLibraryIcon as BuildingLibrarySolid, CalendarDaysIcon as CalendarDaysSolid, ChartBarIcon as ChartBarSolid,
  ChartPieIcon as ChartPieSolid, Cog6ToothIcon as Cog6ToothSolid,
} from '@heroicons/vue/24/solid'

/** The app's sections, shared by the sidebar, the tab bar and the ⌘1–5 shortcuts. Outline icon, solid when active. */
export const TABS = [
  { to: '/', label: 'Month', icon: CalendarDaysIcon, active: CalendarDaysSolid },
  { to: '/insights', label: 'Insights', icon: ChartBarIcon, active: ChartBarSolid },
  { to: '/accounts', label: 'Accounts', icon: BuildingLibraryIcon, active: BuildingLibrarySolid },
  { to: '/budgets', label: 'Budgets', icon: ChartPieIcon, active: ChartPieSolid },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon, active: Cog6ToothSolid },
] as const
