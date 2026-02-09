import { useState, useCallback } from 'react'
import { GEO_TIMEOUT_MS } from '@/config/constants'

interface GeoPosition {
  readonly lat: number
  readonly lng: number
}

interface UseGeolocationReturn {
  readonly getPosition: () => Promise<GeoPosition | null>
  readonly isLoading: boolean
  readonly error: string | null
}

export function useGeolocation(): UseGeolocationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPosition = useCallback(async (): Promise<GeoPosition | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: GEO_TIMEOUT_MS,
          maximumAge: 30_000,
        })
      })

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
    } catch {
      setError('Could not get location')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { getPosition, isLoading, error }
}
