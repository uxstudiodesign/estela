import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LoginPage } from '@/pages/auth/LoginPage'

// Lazy-loaded pages for code splitting
const CourierHome = lazy(() => import('@/pages/courier/CourierHome').then((m) => ({ default: m.CourierHome })))
const NewPickupPage = lazy(() => import('@/pages/courier/NewPickupPage').then((m) => ({ default: m.NewPickupPage })))
const ConfirmDeliveryPage = lazy(() => import('@/pages/courier/ConfirmDeliveryPage').then((m) => ({ default: m.ConfirmDeliveryPage })))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const ParcelDetailPage = lazy(() => import('@/pages/admin/ParcelDetailPage').then((m) => ({ default: m.ParcelDetailPage })))
const BoatsPage = lazy(() => import('@/pages/admin/BoatsPage').then((m) => ({ default: m.BoatsPage })))
const CouriersPage = lazy(() => import('@/pages/admin/CouriersPage').then((m) => ({ default: m.CouriersPage })))
const ComingSoonPage = lazy(() => import('@/pages/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage })))
const FeatureComingSoonPage = lazy(() => import('@/pages/admin/FeatureComingSoonPage').then((m) => ({ default: m.FeatureComingSoonPage })))

function LazyPage({ children }: { readonly children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner className="min-h-[60vh]" />}>
      {children}
    </Suspense>
  )
}

function RootRedirect() {
  const { profile, isLoading } = useAuth()

  if (isLoading) return null

  if (!profile) return <Navigate to="/login" replace />

  return profile.role === 'admin'
    ? <Navigate to="/admin" replace />
    : <Navigate to="/courier" replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/coming-soon" element={<LazyPage><ComingSoonPage /></LazyPage>} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleRoute allowedRoles={['courier']} />}>
            <Route path="/courier" element={<LazyPage><CourierHome /></LazyPage>} />
            <Route path="/courier/pickup" element={<LazyPage><NewPickupPage /></LazyPage>} />
            <Route path="/courier/delivery" element={<LazyPage><ConfirmDeliveryPage /></LazyPage>} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<LazyPage><AdminDashboard /></LazyPage>} />
            <Route path="/admin/parcels/:id" element={<LazyPage><ParcelDetailPage /></LazyPage>} />
            <Route path="/admin/boats" element={<LazyPage><BoatsPage /></LazyPage>} />
            <Route path="/admin/couriers" element={<LazyPage><CouriersPage /></LazyPage>} />
            <Route path="/admin/features/:featureId" element={<LazyPage><FeatureComingSoonPage /></LazyPage>} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
