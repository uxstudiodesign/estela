export const APP_NAME = 'Estela OS'

export const MAX_PHOTO_SIZE_BYTES = 1_048_576 // 1MB
export const MAX_PHOTO_DIMENSION = 1920
export const PHOTO_QUALITY_START = 0.8
export const PHOTO_QUALITY_STEP = 0.1
export const PHOTO_QUALITY_MIN = 0.4

export const PARCELS_RECENT_HOURS = 24
export const TOUCH_TARGET_MIN_PX = 48
export const TOAST_DURATION_MS = 4000
export const GEO_TIMEOUT_MS = 10_000
export const NETWORK_RETRY_COUNT = 3

export const CARRIERS = [
  'DHL',
  'FedEx',
  'UPS',
  'GLS',
  'MRW',
  'SEUR',
  'Correos',
  'Other',
] as const

export type CarrierName = (typeof CARRIERS)[number]

export const PARCEL_STATUSES = ['picked_up', 'delivered'] as const
export type ParcelStatus = (typeof PARCEL_STATUSES)[number]

export const COURIER_ROLES = ['courier', 'admin'] as const
export type CourierRole = (typeof COURIER_ROLES)[number]
