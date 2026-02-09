import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useParcels } from '@/hooks/useParcels'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useToast } from '@/components/ui/Toast'
import { BarcodeScanner } from '@/components/shared/BarcodeScanner'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { ParcelCard } from '@/components/shared/ParcelCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Parcel } from '@/types/database'

type Step = 'select' | 'photo' | 'confirm' | 'success'

export function ConfirmDeliveryPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { parcels, isLoading, fetchPickedUpParcels, updateParcelDelivery, uploadParcelPhoto } = useParcels()
  const { getPosition } = useGeolocation()
  const { showToast } = useToast()

  const [step, setStep] = useState<Step>('select')
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchPickedUpParcels()
  }, [fetchPickedUpParcels])

  const handleScanBarcode = useCallback((barcode: string) => {
    const found = parcels.find((p) => p.barcode === barcode)
    if (found) {
      setSelectedParcel(found)
      setShowScanner(false)
      setStep('photo')
    } else {
      showToast('No matching parcel found for this barcode', 'warning')
    }
  }, [parcels, showToast])

  function handleSelectParcel(parcel: Parcel) {
    setSelectedParcel(parcel)
    setStep('photo')
  }

  function handlePhoto(blob: Blob) {
    setPhoto(blob)
    setStep('confirm')
  }

  async function handleConfirm() {
    if (!profile || !selectedParcel) return

    setIsSubmitting(true)
    try {
      const position = await getPosition()

      let photoUrl: string | undefined
      if (photo) {
        photoUrl = await uploadParcelPhoto(photo, 'delivery', selectedParcel.id)
      }

      await updateParcelDelivery(selectedParcel.id, {
        delivered_by: profile.id,
        delivery_photo_url: photoUrl,
        delivery_latitude: position?.lat ?? null,
        delivery_longitude: position?.lng ?? null,
      })

      setStep('success')
      showToast('Delivery confirmed!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to confirm delivery', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setSelectedParcel(null)
    setPhoto(null)
    setSearch('')
    setShowScanner(false)
    setStep('select')
    fetchPickedUpParcels()
  }

  const filteredParcels = search
    ? parcels.filter((p) =>
        p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
        p.carrier?.toLowerCase().includes(search.toLowerCase())
      )
    : parcels

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (step === 'select') navigate('/courier')
            else if (step === 'photo') setStep('select')
            else if (step === 'confirm') setStep('photo')
          }}
          className="p-2 rounded-lg hover:bg-surface-dark transition-colors"
        >
          <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text">Mark Delivery</h1>
      </div>

      {/* Step: Select Parcel */}
      {step === 'select' && (
        <div>
          {showScanner ? (
            <div className="mb-4">
              <BarcodeScanner
                isActive={showScanner}
                onScan={handleScanBarcode}
              />
              <Button
                variant="secondary"
                onClick={() => setShowScanner(false)}
                fullWidth
                className="mt-3"
              >
                Cancel Scan
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by barcode..."
                  />
                </div>
                <Button
                  onClick={() => setShowScanner(true)}
                  variant="secondary"
                  className="flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </Button>
              </div>

              <p className="text-sm text-text-light mb-3">
                {filteredParcels.length} parcel{filteredParcels.length !== 1 ? 's' : ''} in transit
              </p>

              {isLoading ? (
                <LoadingSpinner className="py-8" />
              ) : filteredParcels.length === 0 ? (
                <EmptyState
                  title="No parcels in transit"
                  description={search ? 'No matching parcels found' : 'All parcels have been delivered'}
                />
              ) : (
                <div className="space-y-2">
                  {filteredParcels.map((parcel) => (
                    <ParcelCard
                      key={parcel.id}
                      parcel={parcel}
                      boatName={(parcel as Record<string, unknown>).boats ? ((parcel as Record<string, unknown>).boats as { name: string }).name : undefined}
                      onClick={() => handleSelectParcel(parcel)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step: Photo */}
      {step === 'photo' && (
        <div>
          <div className="bg-white rounded-lg border border-surface-dark p-3 mb-4">
            <p className="text-xs text-text-light">Delivering</p>
            <p className="font-mono font-semibold text-text">{selectedParcel?.barcode}</p>
          </div>
          <p className="text-text-light mb-4">Take a delivery confirmation photo</p>
          <PhotoCapture
            onCapture={handlePhoto}
            label="Take Delivery Photo"
          />
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && selectedParcel && (
        <div className="space-y-4">
          <p className="text-text-light mb-2">Review and confirm delivery</p>

          <div className="bg-white rounded-lg border border-surface-dark p-4 space-y-3">
            <div>
              <p className="text-xs text-text-light">Barcode</p>
              <p className="font-mono font-semibold text-text">{selectedParcel.barcode}</p>
            </div>
            {selectedParcel.picked_up_at && (
              <div>
                <p className="text-xs text-text-light">Picked up</p>
                <p className="text-text">{new Date(selectedParcel.picked_up_at).toLocaleString()}</p>
              </div>
            )}
            {photo && (
              <div>
                <p className="text-xs text-text-light mb-1">Delivery Photo</p>
                <img
                  src={URL.createObjectURL(photo)}
                  alt="Delivery photo"
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            variant="success"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
          >
            Confirm Delivery
          </Button>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Delivery Confirmed!</h2>
          <p className="text-text-light mb-8">The parcel has been marked as delivered</p>

          <div className="space-y-3">
            <Button onClick={handleReset} fullWidth size="lg">
              Deliver Another
            </Button>
            <Button onClick={() => navigate('/courier')} variant="secondary" fullWidth>
              Go Home
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
