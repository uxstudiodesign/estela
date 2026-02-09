import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '@/config/supabase'
import type { AuthState, AuthContextValue } from '@/types/auth'
import type { Courier } from '@/types/database'
import type { User, Session } from '@supabase/supabase-js'

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchCourierProfile(userId: string): Promise<Courier | null> {
  const { data, error } = await supabase
    .from('couriers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as Courier
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  const handleAuthChange = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ user: null, session: null, profile: null, isLoading: false })
      return
    }

    const profile = await fetchCourierProfile(session.user.id)

    if (!profile) {
      await supabase.auth.signOut()
      setState({ user: null, session: null, profile: null, isLoading: false })
      return
    }

    setState({ user: session.user, session, profile, isLoading: false })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ user: null, session: null, profile: null, isLoading: false })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleAuthChange(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [handleAuthChange])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }, [])

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
