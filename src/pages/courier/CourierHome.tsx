import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useParcels } from '@/hooks/useParcels'
import { ParcelCard } from '@/components/shared/ParcelCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function CourierHome() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { parcels, isLoading, fetchRecentParcels } = useParcels()

  useEffect(() => {
    if (profile?.user_id) {
      fetchRecentParcels(profile.user_id)
    }
  }, [profile?.user_id, fetchRecentParcels])

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Hello, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-light">What would you like to do?</p>
        </div>
        <button
          onClick={() => signOut()}
          className="p-2 rounded-lg hover:bg-surface-dark transition-colors"
          aria-label="Sign out"
        >
          <svg className="w-5 h-5 text-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mb-8">
        <button
          onClick={() => navigate('/courier/pickup')}
          className="w-full h-20 bg-navy text-white rounded-xl flex items-center justify-center gap-3 text-lg font-semibold hover:bg-navy-light transition-colors active:scale-[0.98]"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          New Pickup
        </button>

        <button
          onClick={() => navigate('/courier/delivery')}
          className="w-full h-20 bg-success text-white rounded-xl flex items-center justify-center gap-3 text-lg font-semibold hover:bg-success/90 transition-colors active:scale-[0.98]"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Mark Delivery
        </button>
      </div>

      {/* Recent Parcels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text">Recent Parcels (24h)</h2>
          <button
            onClick={() => {
              if (profile?.user_id) fetchRecentParcels(profile.user_id)
            }}
            className="text-sm text-navy font-medium"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-8" />
        ) : parcels.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            title="No recent parcels"
            description="Parcels you pick up will appear here"
          />
        ) : (
          <div className="space-y-2">
            {parcels.map((parcel) => (
              <ParcelCard
                key={parcel.id}
                parcel={parcel}
                boatName={(parcel as Record<string, unknown>).boats ? ((parcel as Record<string, unknown>).boats as { name: string }).name : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
