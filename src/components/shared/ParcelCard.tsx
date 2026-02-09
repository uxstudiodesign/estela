import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatRelativeTime } from '@/lib/formatters'
import type { Parcel } from '@/types/database'

interface ParcelCardProps {
  readonly parcel: Parcel
  readonly boatName?: string
  readonly courierName?: string
  readonly onClick?: () => void
}

export function ParcelCard({ parcel, boatName, courierName, onClick }: ParcelCardProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`
        w-full bg-white rounded-lg border border-surface-dark p-4 text-left
        ${onClick ? 'hover:border-navy/30 hover:shadow-sm transition-all cursor-pointer' : ''}
      `.trim()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-mono font-semibold text-text truncate">
          {parcel.barcode ?? 'No barcode'}
        </p>
        <StatusBadge status={parcel.status} />
      </div>

      <div className="space-y-1 text-sm text-text-light">
        {boatName && (
          <p className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h18M5 17l2-8h10l2 8M12 3v6" />
            </svg>
            {boatName}
          </p>
        )}
        {courierName && (
          <p className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {courierName}
          </p>
        )}
        {parcel.carrier && (
          <p className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {parcel.carrier}
          </p>
        )}
        {parcel.picked_up_at && (
          <p className="text-xs">{formatRelativeTime(parcel.picked_up_at)}</p>
        )}
      </div>
    </Component>
  )
}
