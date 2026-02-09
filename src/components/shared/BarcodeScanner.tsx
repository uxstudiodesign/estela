import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface BarcodeScannerProps {
  readonly onScan: (barcode: string) => void
  readonly onError?: (error: string) => void
  readonly isActive: boolean
}

const SCANNER_ID = 'barcode-scanner'

export function BarcodeScanner({ onScan, onError, isActive }: BarcodeScannerProps) {
  const scannerRef = useRef<unknown>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    if (!isActive) return

    let cancelled = false

    async function initScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        if (cancelled) return

        const el = document.getElementById(SCANNER_ID)
        if (!el) {
          setShowManual(true)
          return
        }

        const scanner = new Html5Qrcode(SCANNER_ID)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 300, height: 150 },
            aspectRatio: 1.777,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
            ],
          },
          (decodedText) => {
            onScan(decodedText)
            scanner.stop().catch(() => {})
          },
          () => {}
        )
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Camera access denied'
        setCameraError(message)
        onError?.(message)
        setShowManual(true)
      }
    }

    initScanner()

    return () => {
      cancelled = true
      const scanner = scannerRef.current as { stop?: () => Promise<void>; clear?: () => void; isScanning?: boolean } | null
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop?.().then(() => {
            try { scanner.clear?.() } catch { /* already cleared */ }
          }).catch(() => {})
        } else {
          try { scanner.clear?.() } catch { /* already cleared */ }
        }
        scannerRef.current = null
      }
    }
  }, [isActive, onScan, onError])

  function handleManualSubmit() {
    const trimmed = manualBarcode.trim()
    if (trimmed) {
      onScan(trimmed)
    }
  }

  if (showManual || cameraError) {
    return (
      <div className="space-y-4">
        {cameraError && (
          <div className="bg-warning/10 text-warning px-4 py-3 rounded-lg text-sm">
            Camera unavailable. Enter the barcode manually.
          </div>
        )}
        <Input
          label="Barcode Number"
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          placeholder="Enter barcode..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleManualSubmit()
          }}
        />
        <div className="flex gap-2">
          <Button onClick={handleManualSubmit} fullWidth disabled={!manualBarcode.trim()}>
            Confirm
          </Button>
          {cameraError && (
            <Button
              variant="secondary"
              onClick={() => {
                setCameraError(null)
                setShowManual(false)
              }}
            >
              Retry Camera
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        id={SCANNER_ID}
        className="w-full rounded-lg overflow-hidden bg-black min-h-[200px]"
      />
      <button
        type="button"
        onClick={() => setShowManual(true)}
        className="text-sm text-navy underline"
      >
        Enter barcode manually
      </button>
    </div>
  )
}
