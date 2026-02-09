import { useState, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import type { Boat } from '@/types/database'
import type { BoatFormData } from '@/lib/validators'

export function useBoats() {
  const [boats, setBoats] = useState<readonly Boat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBoats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('boats')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw new Error(fetchError.message)
      setBoats((data ?? []) as Boat[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createBoat = useCallback(async (boatData: BoatFormData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('boats')
        .insert(boatData)
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)
      return data as Boat
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create boat')
    }
  }, [])

  const updateBoat = useCallback(async (id: string, boatData: Partial<BoatFormData>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('boats')
        .update(boatData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)
      return data as Boat
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update boat')
    }
  }, [])

  const deleteBoat = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('boats')
        .delete()
        .eq('id', id)

      if (deleteError) throw new Error(deleteError.message)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete boat')
    }
  }, [])

  return {
    boats,
    isLoading,
    error,
    fetchBoats,
    createBoat,
    updateBoat,
    deleteBoat,
  }
}
