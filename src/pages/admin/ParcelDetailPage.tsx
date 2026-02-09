import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useParcels } from '@/hooks/useParcels'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateTime } from '@/lib/formatters'
import type { Parcel, ParcelStatus } from '@/types/database'

interface ParcelDetail extends Parcel {
  readonly boats: { name: string } | null
  readonly pickup_courier: { full_name: string } | null
  readonly delivery_courier: { full_name: string } | null
}

export function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchParcelById, isLoading } = useParcels()
  const [parcel, setParcel] = useState<ParcelDetail | null>(null)

  useEffect(() => {
    if (id) {
      fetchParcelById(id).then((data) => setParcel(data as ParcelDetail | null))
    }
  }, [id, fetchParcelById])

  if (isLoading) {
    return <LoadingSpinner className="min-h-[60vh]" />
  }

  if (!parcel) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-light">Parcel not found</p>
      </div>
    )
  }

  const boatName = parcel.boats?.name
  const pickupCourier = parcel.pickup_courier?.full_name
  const deliveryCourier = parcel.delivery_courier?.full_name

  function googleMapsUrl(lat: number, lng: number) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-lg hover:bg-surface-dark transition-colors"
        >
          <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text font-mono">{parcel.barcode}</h1>
        </div>
        <StatusBadge status={parcel.status as ParcelStatus} />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <InfoCard label="Boat" value={boatName ?? '—'} />
        <InfoCard label="Carrier" value={parcel.carrier ?? '—'} />
        <InfoCard label="Picked up by" value={pickupCourier ?? '—'} />
        <InfoCard label="Delivered by" value={deliveryCourier ?? '—'} />
        {parcel.notes && (
          <div className="lg:col-span-2">
            <InfoCard label="Notes" value={parcel.notes} />
          </div>
        )}
      </div>

      {/* Photos */}
      <h2 className="text-lg font-semibold text-text mb-3">Photos</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <PhotoCard
          label="Pickup Photo"
          url={parcel.pickup_photo_url}
          timestamp={parcel.picked_up_at}
        />
        <PhotoCard
          label="Delivery Photo"
          url={parcel.delivery_photo_url}
          timestamp={parcel.delivered_at}
        />
      </div>

      {/* Location */}
      <h2 className="text-lg font-semibold text-text mb-3">Locations</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <LocationCard
          label="Pickup Location"
          lat={parcel.pickup_latitude}
          lng={parcel.pickup_longitude}
          googleMapsUrl={googleMapsUrl}
        />
        <LocationCard
          label="Delivery Location"
          lat={parcel.delivery_latitude}
          lng={parcel.delivery_longitude}
          googleMapsUrl={googleMapsUrl}
        />
      </div>

      {/* Timeline */}
      <h2 className="text-lg font-semibold text-text mb-3">Timeline</h2>
      <div className="bg-white rounded-lg border border-surface-dark p-4">
        <div className="relative pl-6">
          <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-surface-dark" />

          <TimelineItem
            active
            label="Picked Up"
            detail={pickupCourier ? `by ${pickupCourier}` : undefined}
            timestamp={parcel.picked_up_at}
            color="bg-navy"
          />

          {parcel.status === 'delivered' && (
            <TimelineItem
              active
              label="Delivered"
              detail={deliveryCourier ? `by ${deliveryCourier}` : undefined}
              timestamp={parcel.delivered_at}
              color="bg-success"
            />
          )}

          {parcel.status === 'picked_up' && (
            <TimelineItem
              active={false}
              label="Delivery pending"
              color="bg-surface-dark"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="bg-white rounded-lg border border-surface-dark p-4">
      <p className="text-xs text-text-light mb-1">{label}</p>
      <p className="text-text font-medium">{value}</p>
    </div>
  )
}

function PhotoCard({
  label,
  url,
  timestamp,
}: {
  readonly label: string
  readonly url: string | null
  readonly timestamp: string | null
}) {
  return (
    <div className="bg-white rounded-lg border border-surface-dark overflow-hidden">
      <div className="px-4 py-2 border-b border-surface-dark flex items-center justify-between">
        <p className="text-sm font-medium text-text">{label}</p>
        {timestamp && (
          <p className="text-xs text-text-light">{formatDateTime(timestamp)}</p>
        )}
      </div>
      {url ? (
        <img src={url} alt={label} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-surface flex items-center justify-center">
          <p className="text-sm text-text-light">No photo</p>
        </div>
      )}
    </div>
  )
}

function LocationCard({
  label,
  lat,
  lng,
  googleMapsUrl,
}: {
  readonly label: string
  readonly lat: number | null
  readonly lng: number | null
  readonly googleMapsUrl: (lat: number, lng: number) => string
}) {
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    if (lat == null || lng == null) return

    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`)
      .then((res) => res.json())
      .then((data) => {
        const addr = data.address
        if (addr) {
          const parts = [addr.road, addr.suburb || addr.neighbourhood, addr.city || addr.town].filter(Boolean)
          setAddress(parts.length > 0 ? `Near ${parts.join(', ')}` : null)
        }
      })
      .catch(() => {})
  }, [lat, lng])

  return (
    <div className="bg-white rounded-lg border border-surface-dark p-4">
      <p className="text-xs text-text-light mb-1">{label}</p>
      {lat != null && lng != null ? (
        <div>
          <p className="text-sm text-text font-medium mb-1">
            {address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </p>
          <a
            href={googleMapsUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-navy font-medium hover:underline"
          >
            Open in Maps
          </a>
        </div>
      ) : (
        <p className="text-sm text-text-light">Not available</p>
      )}
    </div>
  )
}

function TimelineItem({
  active,
  label,
  detail,
  timestamp,
  color,
}: {
  readonly active: boolean
  readonly label: string
  readonly detail?: string
  readonly timestamp?: string | null
  readonly color: string
}) {
  return (
    <div className="relative mb-4 last:mb-0">
      <div className={`absolute -left-[1.15rem] top-1 w-3 h-3 rounded-full ${color}`} />
      <div>
        <p className={`text-sm font-medium ${active ? 'text-text' : 'text-text-light'}`}>
          {label}
        </p>
        {detail && <p className="text-xs text-text-light">{detail}</p>}
        {timestamp && (
          <p className="text-xs text-text-light">{formatDateTime(timestamp)}</p>
        )}
      </div>
    </div>
  )
}
