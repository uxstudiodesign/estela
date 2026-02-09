import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useParcels } from '@/hooks/useParcels'
import { useBoats } from '@/hooks/useBoats'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useToast } from '@/components/ui/Toast'
import { BarcodeScanner } from '@/components/shared/BarcodeScanner'
import { PhotoCapture } from '@/components/shared/PhotoCapture'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { CARRIERS } from '@/config/constants'

type Step = 'scan' | 'photo' | 'details' | 'confirm' | 'success'

interface PickupData {
  readonly barcode: string
  readonly photo: Blob | null
  readonly boat_id: string
  readonly carrier: string
  readonly notes: string
}

const STEPS: readonly Step[] = ['scan', 'photo', 'details', 'confirm']

export function NewPickupPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { createParcel, uploadParcelPhoto } = useParcels()
  const { boats, fetchBoats } = useBoats()
  const { getPosition } = useGeolocation()
  const { showToast } = useToast()

  const [step, setStep] = useState<Step>('scan')
  const [data, setData] = useState<PickupData>({
    barcode: '',
    photo: null,
    boat_id: '',
    carrier: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchBoats()
  }, [fetchBoats])

  const handleScan = useCallback((barcode: string) => {
    setData((prev) => ({ ...prev, barcode }))
    setStep('photo')
  }, [])

  const handlePhoto = useCallback((blob: Blob) => {
    setData((prev) => ({ ...prev, photo: blob }))
    setStep('details')
  }, [])

  async function handleConfirm() {
    if (!profile) return

    setIsSubmitting(true)
    try {
      const position = await getPosition()

      // Get courier ID from profile
      const courierId = profile.id

      // Create parcel first to get ID for photo upload
      const parcel = await createParcel({
        barcode: data.barcode,
        boat_id: data.boat_id,
        carrier: data.carrier || undefined,
        notes: data.notes || undefined,
        picked_up_by: courierId,
        pickup_latitude: position?.lat ?? null,
        pickup_longitude: position?.lng ?? null,
      })

      // Upload photo if available
      if (data.photo && parcel) {
        const photoUrl = await uploadParcelPhoto(data.photo, 'pickup', parcel.id)

        // Update parcel with photo URL
        const { supabase } = await import('@/config/supabase')
        await supabase
          .from('parcels')
          .update({ pickup_photo_url: photoUrl })
          .eq('id', parcel.id)
      }

      setStep('success')
      showToast('Parcel picked up successfully!', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to register pickup', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setData({ barcode: '', photo: null, boat_id: '', carrier: '', notes: '' })
    setStep('scan')
  }

  const currentStepIndex = STEPS.indexOf(step as typeof STEPS[number])
  const selectedBoat = boats.find((b) => b.id === data.boat_id)

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step === 'scan' ? navigate('/courier') : setStep(STEPS[Math.max(0, currentStepIndex - 1)])}
          className="p-2 rounded-lg hover:bg-surface-dark transition-colors"
        >
          <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-text">New Pickup</h1>
      </div>

      {/* Progress Dots */}
      {step !== 'success' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i <= currentStepIndex ? 'bg-navy' : 'bg-surface-dark'
              }`}
            />
          ))}
        </div>
      )}

      {/* Step Content */}
      {step === 'scan' && (
        <div>
          <p className="text-text-light mb-4">Scan the package barcode</p>
          <BarcodeScanner
            isActive={step === 'scan'}
            onScan={handleScan}
          />
        </div>
      )}

      {step === 'photo' && (
        <div>
          <p className="text-text-light mb-4">Take a photo of the package label</p>
          <PhotoCapture
            onCapture={handlePhoto}
            label="Take Pickup Photo"
          />
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          <p className="text-text-light mb-2">Fill in the details</p>

          <div className="bg-white rounded-lg border border-surface-dark p-3">
            <p className="text-xs text-text-light">Barcode</p>
            <p className="font-mono font-semibold text-text">{data.barcode}</p>
          </div>

          <Select
            label="Destination Boat"
            options={boats.map((b) => ({ value: b.id, label: b.name }))}
            value={data.boat_id}
            onChange={(val) => setData((prev) => ({ ...prev, boat_id: val }))}
            placeholder="Select a boat..."
            searchable
            error={!data.boat_id ? undefined : undefined}
          />

          <Select
            label="Carrier (optional)"
            options={CARRIERS.map((c) => ({ value: c, label: c }))}
            value={data.carrier}
            onChange={(val) => setData((prev) => ({ ...prev, carrier: val }))}
            placeholder="Select carrier..."
          />

          <div>
            <label className="block text-sm font-medium text-text mb-1">Notes (optional)</label>
            <textarea
              value={data.notes}
              onChange={(e) => setData((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full h-20 px-4 py-3 rounded-lg border border-surface-dark bg-white text-text focus:outline-none focus:ring-2 focus:ring-navy resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          <Button
            onClick={() => setStep('confirm')}
            fullWidth
            size="lg"
            disabled={!data.boat_id}
          >
            Continue
          </Button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <p className="text-text-light mb-2">Review and confirm</p>

          <div className="bg-white rounded-lg border border-surface-dark p-4 space-y-3">
            <div>
              <p className="text-xs text-text-light">Barcode</p>
              <p className="font-mono font-semibold text-text">{data.barcode}</p>
            </div>
            <div>
              <p className="text-xs text-text-light">Boat</p>
              <p className="font-medium text-text">{selectedBoat?.name}</p>
            </div>
            {data.carrier && (
              <div>
                <p className="text-xs text-text-light">Carrier</p>
                <p className="text-text">{data.carrier}</p>
              </div>
            )}
            {data.notes && (
              <div>
                <p className="text-xs text-text-light">Notes</p>
                <p className="text-text">{data.notes}</p>
              </div>
            )}
            {data.photo && (
              <div>
                <p className="text-xs text-text-light mb-1">Photo</p>
                <img
                  src={URL.createObjectURL(data.photo)}
                  alt="Pickup photo"
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            fullWidth
            size="lg"
            isLoading={isSubmitting}
          >
            Confirm Pickup
          </Button>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Parcel Picked Up!</h2>
          <p className="text-text-light mb-8">The parcel has been registered successfully</p>

          <div className="space-y-3">
            <Button onClick={handleReset} fullWidth size="lg">
              Scan Another
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
