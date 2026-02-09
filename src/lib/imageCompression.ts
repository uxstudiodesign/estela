import { MAX_PHOTO_SIZE_BYTES, MAX_PHOTO_DIMENSION, PHOTO_QUALITY_START, PHOTO_QUALITY_STEP, PHOTO_QUALITY_MIN } from '@/config/constants'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to convert canvas to blob'))
      },
      'image/jpeg',
      quality
    )
  })
}

export async function compressImage(
  file: File,
  maxSizeBytes: number = MAX_PHOTO_SIZE_BYTES,
  maxDimension: number = MAX_PHOTO_DIMENSION,
): Promise<Blob> {
  const img = await loadImage(file)

  let { width, height } = img
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas 2d context')
  ctx.drawImage(img, 0, 0, width, height)

  URL.revokeObjectURL(img.src)

  let quality = PHOTO_QUALITY_START
  let blob = await canvasToBlob(canvas, quality)

  while (blob.size > maxSizeBytes && quality > PHOTO_QUALITY_MIN) {
    quality -= PHOTO_QUALITY_STEP
    blob = await canvasToBlob(canvas, quality)
  }

  return blob
}
