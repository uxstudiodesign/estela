import { useState, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import type { Parcel } from '@/types/database'
import { PARCELS_RECENT_HOURS } from '@/config/constants'

export interface ParcelFilters {
  readonly status?: string
  readonly boat_id?: string
  readonly search?: string
  readonly dateRange?: 'today' | '7days' | '30days' | 'all'
}

interface ParcelWithJoins extends Parcel {
  readonly boats: { name: string } | null
  readonly pickup_courier: { full_name: string } | null
  readonly delivery_courier: { full_name: string } | null
}

export function useParcels() {
  const [parcels, setParcels] = useState<readonly ParcelWithJoins[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecentParcels = useCallback(async (courierUserId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const since = new Date()
      since.setHours(since.getHours() - PARCELS_RECENT_HOURS)

      let query = supabase
        .from('parcels')
        .select('*, boats(name), pickup_courier:couriers!picked_up_by(full_name), delivery_courier:couriers!delivered_by(full_name)')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })

      if (courierUserId) {
        const { data: courier } = await supabase
          .from('couriers')
          .select('id')
          .eq('user_id', courierUserId)
          .single()

        if (courier) {
          query = query.eq('picked_up_by', courier.id)
        }
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw new Error(fetchError.message)
      setParcels((data ?? []) as unknown as ParcelWithJoins[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parcels')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchPickedUpParcels = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('parcels')
        .select('*, boats(name), pickup_courier:couriers!picked_up_by(full_name)')
        .eq('status', 'picked_up')
        .order('created_at', { ascending: false })

      if (fetchError) throw new Error(fetchError.message)
      setParcels((data ?? []) as unknown as ParcelWithJoins[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parcels')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAllParcels = useCallback(async (filters?: ParcelFilters) => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('parcels')
        .select('*, boats(name), pickup_courier:couriers!picked_up_by(full_name), delivery_courier:couriers!delivered_by(full_name)')
        .order('created_at', { ascending: false })

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters?.boat_id) {
        query = query.eq('boat_id', filters.boat_id)
      }

      if (filters?.search) {
        query = query.or(`barcode.ilike.%${filters.search}%,carrier.ilike.%${filters.search}%`)
      }

      if (filters?.dateRange && filters.dateRange !== 'all') {
        const now = new Date()
        let since: Date
        switch (filters.dateRange) {
          case 'today':
            since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case '7days':
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30days':
            since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        }
        query = query.gte('created_at', since.toISOString())
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw new Error(fetchError.message)
      setParcels((data ?? []) as unknown as ParcelWithJoins[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parcels')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchParcelById = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('parcels')
        .select('*, boats(name), pickup_courier:couriers!picked_up_by(full_name), delivery_courier:couriers!delivered_by(full_name)')
        .eq('id', id)
        .single()

      if (fetchError) throw new Error(fetchError.message)
      return data as unknown as ParcelWithJoins
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parcel')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createParcel = useCallback(async (parcelData: {
    barcode: string
    boat_id: string
    carrier?: string
    description?: string
    notes?: string
    picked_up_by: string
    pickup_photo_url?: string
    pickup_latitude?: number | null
    pickup_longitude?: number | null
  }) => {
    try {
      const { data, error: insertError } = await supabase
        .from('parcels')
        .insert({
          ...parcelData,
          status: 'picked_up' as const,
          picked_up_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)
      return data as Parcel
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create parcel')
    }
  }, [])

  const updateParcelDelivery = useCallback(async (
    id: string,
    deliveryData: {
      delivered_by: string
      delivery_photo_url?: string
      delivery_latitude?: number | null
      delivery_longitude?: number | null
    },
  ) => {
    try {
      const { data, error: updateError } = await supabase
        .from('parcels')
        .update({
          ...deliveryData,
          status: 'delivered' as const,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)
      return data as Parcel
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update parcel')
    }
  }, [])

  const uploadParcelPhoto = useCallback(async (
    blob: Blob,
    folder: 'pickup' | 'delivery',
    parcelId: string,
  ): Promise<string> => {
    const path = `${folder}/${parcelId}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('parcel-photos')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data } = supabase.storage
      .from('parcel-photos')
      .getPublicUrl(path)

    return data.publicUrl
  }, [])

  const getParcelStats = useCallback(async () => {
    const [totalParcels, inTransit, delivered] = await Promise.all([
      supabase
        .from('parcels')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('parcels')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'picked_up'),
      supabase
        .from('parcels')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'delivered'),
    ])

    return {
      totalParcels: totalParcels.count ?? 0,
      inTransit: inTransit.count ?? 0,
      delivered: delivered.count ?? 0,
    }
  }, [])

  return {
    parcels,
    isLoading,
    error,
    fetchRecentParcels,
    fetchPickedUpParcels,
    fetchAllParcels,
    fetchParcelById,
    createParcel,
    updateParcelDelivery,
    uploadParcelPhoto,
    getParcelStats,
  }
}
