import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParcels, type ParcelFilters } from '@/hooks/useParcels'
import { useBoats } from '@/hooks/useBoats'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatRelativeTime } from '@/lib/formatters'
import type { ParcelStatus } from '@/types/database'

export function AdminDashboard() {
  const navigate = useNavigate()
  const { parcels, isLoading, fetchAllParcels, getParcelStats } = useParcels()
  const { boats, fetchBoats } = useBoats()

  const [stats, setStats] = useState({ totalParcels: 0, inTransit: 0, delivered: 0 })
  const [filters, setFilters] = useState<ParcelFilters>({
    status: 'all',
    dateRange: 'all',
    search: '',
  })

  useEffect(() => {
    fetchBoats()
    loadStats()
  }, [fetchBoats])

  useEffect(() => {
    fetchAllParcels(filters)
  }, [filters, fetchAllParcels])

  async function loadStats() {
    try {
      const data = await getParcelStats()
      setStats(data)
    } catch {
      // Stats are non-critical
    }
  }

  function updateFilter(key: keyof ParcelFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const statCards = [
    { label: 'Total Parcels', value: stats.totalParcels, color: 'bg-navy/10 text-navy' },
    { label: 'In Transit', value: stats.inTransit, color: 'bg-warning/10 text-warning' },
    { label: 'Delivered', value: stats.delivered, color: 'bg-success/10 text-success' },
  ]

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-2xl font-bold text-text mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <p className="text-2xl lg:text-3xl font-bold">{card.value}</p>
            <p className="text-xs lg:text-sm mt-1 opacity-80">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={filters.search ?? ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search barcode, carrier..."
          />
        </div>
        <select
          value={filters.status ?? 'all'}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="h-12 px-3 rounded-lg border border-surface-dark bg-white text-text text-sm"
        >
          <option value="all">All Status</option>
          <option value="picked_up">Picked Up</option>
          <option value="delivered">Delivered</option>
        </select>
        <select
          value={filters.dateRange ?? 'today'}
          onChange={(e) => updateFilter('dateRange', e.target.value)}
          className="h-12 px-3 rounded-lg border border-surface-dark bg-white text-text text-sm"
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <button
          onClick={() => { fetchAllParcels(filters); loadStats() }}
          className="h-12 px-4 rounded-lg border border-surface-dark bg-white hover:bg-surface transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5 text-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Parcel Table / List */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : parcels.length === 0 ? (
        <EmptyState
          title="No parcels found"
          description="Try adjusting your filters"
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg border border-surface-dark overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Barcode</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Boat</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Carrier</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Pickup</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-dark">
                {parcels.map((parcel) => {
                  const boatName = (parcel as Record<string, unknown>).boats
                    ? ((parcel as Record<string, unknown>).boats as { name: string }).name
                    : '—'
                  return (
                    <tr
                      key={parcel.id}
                      onClick={() => navigate(`/admin/parcels/${parcel.id}`)}
                      className="hover:bg-surface/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium text-text">
                        {parcel.barcode ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={parcel.status as ParcelStatus} />
                      </td>
                      <td className="px-4 py-3 text-sm text-text">{boatName}</td>
                      <td className="px-4 py-3 text-sm text-text-light">{parcel.carrier ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-light">
                        {parcel.picked_up_at ? formatRelativeTime(parcel.picked_up_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-light">
                        {parcel.delivered_at ? formatRelativeTime(parcel.delivered_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="lg:hidden space-y-2">
            {parcels.map((parcel) => {
              const boatName = (parcel as Record<string, unknown>).boats
                ? ((parcel as Record<string, unknown>).boats as { name: string }).name
                : undefined
              return (
                <button
                  key={parcel.id}
                  onClick={() => navigate(`/admin/parcels/${parcel.id}`)}
                  className="w-full bg-white rounded-lg border border-surface-dark p-4 text-left hover:border-navy/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-mono font-semibold text-sm text-text truncate">
                      {parcel.barcode ?? 'No barcode'}
                    </p>
                    <StatusBadge status={parcel.status as ParcelStatus} />
                  </div>
                  <div className="text-xs text-text-light space-y-0.5">
                    {boatName && <p>{boatName}</p>}
                    {parcel.carrier && <p>{parcel.carrier}</p>}
                    {parcel.picked_up_at && <p>{formatRelativeTime(parcel.picked_up_at)}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
