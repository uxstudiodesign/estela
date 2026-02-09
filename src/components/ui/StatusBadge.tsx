import type { ParcelStatus } from '@/types/database'

interface StatusBadgeProps {
  readonly status: ParcelStatus
}

const statusConfig: Record<ParcelStatus, { label: string; className: string }> = {
  picked_up: { label: 'Picked Up', className: 'bg-navy/10 text-navy' },
  delivered: { label: 'Delivered', className: 'bg-success/10 text-success' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
