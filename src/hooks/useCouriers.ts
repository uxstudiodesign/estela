import { useState, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import type { Courier } from '@/types/database'
import type { CourierFormData } from '@/lib/validators'

export function useCouriers() {
  const [couriers, setCouriers] = useState<readonly Courier[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCouriers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('couriers')
        .select('*')
        .order('full_name', { ascending: true })

      if (fetchError) throw new Error(fetchError.message)
      setCouriers((data ?? []) as Courier[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch couriers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createCourier = useCallback(async (courierData: CourierFormData) => {
    try {
      // Step 1: Create auth user via signUp (MVP approach)
      // Note: This creates a user who will receive a confirmation email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: courierData.email,
        password: courierData.password,
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Failed to create auth user')

      // Step 2: Insert courier profile row
      const { data, error: insertError } = await supabase
        .from('couriers')
        .insert({
          user_id: authData.user.id,
          full_name: courierData.full_name,
          role: courierData.role,
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)
      return data as Courier
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create courier')
    }
  }, [])

  const toggleCourierActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { data, error: updateError } = await supabase
        .from('couriers')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)
      return data as Courier
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update courier')
    }
  }, [])

  return {
    couriers,
    isLoading,
    error,
    fetchCouriers,
    createCourier,
    toggleCourierActive,
  }
}
