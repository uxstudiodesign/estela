import type { User, Session } from '@supabase/supabase-js'
import type { Courier } from './database'

export interface AuthState {
  readonly user: User | null
  readonly session: Session | null
  readonly profile: Courier | null
  readonly isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  readonly signIn: (email: string, password: string) => Promise<void>
  readonly signOut: () => Promise<void>
}
