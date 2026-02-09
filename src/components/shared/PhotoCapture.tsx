import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { compressImage } from '@/lib/imageCompression'
import { MAX_PHOTO_SIZE_BYTES } from '@/config/constants'

interface PhotoCaptureProps {
  readonly onCapture: (blob: Blob) => void
  readonly label?: string
}

export function PhotoCapture({ onCapture, label = 'Take Photo' }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setIsCompressing(true)

    try {
      const blob = await compressImage(file, MAX_PHOTO_SIZE_BYTES)
      const url = URL.createObjectURL(blob)

      setPreview(url)
      setCompressedBlob(blob)
    } catch {
      setError('Failed to process photo. Please try again.')
    } finally {
      setIsCompressing(false)
    }
  }

  function handleUsePhoto() {
    if (compressedBlob) {
      onCapture(compressedBlob)
    }
  }

  function handleRetake() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setCompressedBlob(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <div className="space-y-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            isLoading={isCompressing}
            fullWidth
            size="lg"
          >
            {label}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture')
                fileInputRef.current.click()
                fileInputRef.current.setAttribute('capture', 'environment')
              }
            }}
            fullWidth
            size="md"
          >
            Choose from Gallery
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Captured photo"
            className="w-full rounded-lg border border-surface-dark"
          />
          {compressedBlob && (
            <p className="text-xs text-text-light text-center">
              {(compressedBlob.size / 1024).toFixed(0)} KB
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleUsePhoto} variant="success" fullWidth>
              Use Photo
            </Button>
            <Button onClick={handleRetake} variant="secondary" fullWidth>
              Retake
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-danger-light/20 text-danger px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
