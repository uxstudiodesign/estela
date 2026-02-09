import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { CourierNav } from './CourierNav'
import { AdminSidebar } from './AdminSidebar'

export function AppLayout() {
  const { profile } = useAuth()

  if (!profile) return <Outlet />

  if (profile.role === 'admin') {
    return (
      <div className="min-h-screen bg-surface">
        <AdminSidebar />
        <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <main className="pb-20">
        <Outlet />
      </main>
      <CourierNav />
    </div>
  )
}
