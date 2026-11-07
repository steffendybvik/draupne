/** The app's sections, shared by the sidebar, the tab bar and the ⌘1–5 shortcuts. */
export const TABS = [
  { to: '/', label: 'Month', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/insights', label: 'Insights', icon: 'M4 20V10m6 10V4m6 16v-7m4 7H3' },
  { to: '/accounts', label: 'Accounts', icon: 'M3 10h18M5 10v8m4.67-8v8m4.66-8v8M19 10v8M3 20h18M12 3l9 5H3l9-5Z' },
  { to: '/budgets', label: 'Budgets', icon: 'M12 3v9l7 4M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z' },
  { to: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4' },
] as const
