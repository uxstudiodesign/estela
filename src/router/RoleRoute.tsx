import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { CourierRole } from '@/types/database'

interface RoleRouteProps {
  readonly allowedRoles: readonly CourierRole[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { profile } = useAuth()

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(profile.role)) {
    const redirectTo = profile.role === 'admin' ? '/admin' : '/courier'
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
