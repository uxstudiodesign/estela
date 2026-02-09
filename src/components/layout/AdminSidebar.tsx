import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME } from '@/config/constants'

const navItems = [
  {
    to: '/admin',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/admin/boats',
    label: 'Boats',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h18M5 17l2-8h10l2 8M12 3v6" />
      </svg>
    ),
  },
  {
    to: '/admin/couriers',
    label: 'Couriers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const comingSoonItems = [
  { to: '/admin/features/notifications', label: 'Notifications' },
  { to: '/admin/features/integrations', label: 'Integrations' },
  { to: '/admin/features/analytics', label: 'Analytics' },
  { to: '/admin/features/billing', label: 'Billing' },
]

export function AdminSidebar() {
  const { signOut, profile } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-navy text-white flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded hover:bg-navy-light transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold">{APP_NAME}</span>
        <div className="w-10" />
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-navy text-white z-50
        transform transition-transform duration-200
        lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `.trim()}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-navy-light">
            <h1 className="text-xl font-bold">{APP_NAME}</h1>
            <p className="text-sm text-white/60 mt-1">Admin Dashboard</p>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}
                `.trim()}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}

            {/* Coming Soon section */}
            <div className="pt-3 mt-3 border-t border-navy-light">
              <p className="text-[10px] uppercase tracking-wider text-white/40 px-3 mb-2">Coming Soon</p>
              {comingSoonItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white/70'}
                  `.trim()}
                >
                  <span className="w-5 h-5 flex items-center justify-center text-xs">&#9203;</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="p-3 border-t border-navy-light">
            {profile && (
              <p className="text-xs text-white/60 mb-2 px-3">
                {profile.full_name}
              </p>
            )}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
