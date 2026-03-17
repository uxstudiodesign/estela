export type ParcelStatus = 'picked_up' | 'delivered'
export type CourierRole = 'courier' | 'admin'
export type RegistrationStatus = 'registered' | 'cancelled'

export interface Boat {
  readonly id: string
  readonly name: string
  readonly berth_location: string | null
  readonly captain_name: string | null
  readonly notes: string | null
  readonly created_at: string
}

export interface Courier {
  readonly id: string
  readonly user_id: string
  readonly full_name: string
  readonly phone: string | null
  readonly role: CourierRole
  readonly is_active: boolean
  readonly created_at: string
}

export interface Parcel {
  readonly id: string
  readonly barcode: string | null
  readonly carrier: string | null
  readonly description: string | null
  readonly boat_id: string | null
  readonly status: ParcelStatus
  readonly picked_up_by: string | null
  readonly picked_up_at: string | null
  readonly pickup_photo_url: string | null
  readonly pickup_latitude: number | null
  readonly pickup_longitude: number | null
  readonly delivered_by: string | null
  readonly delivered_at: string | null
  readonly delivery_photo_url: string | null
  readonly delivery_latitude: number | null
  readonly delivery_longitude: number | null
  readonly notes: string | null
  readonly created_at: string
  readonly updated_at: string
}

export interface Registration {
  readonly id: string
  readonly created_at: string
  readonly nome: string
  readonly cognome: string
  readonly email: string
  readonly telefono: string | null
  readonly azienda: string | null
  readonly ruolo: string | null
  readonly provenienza: string | null
  readonly colazione_29: boolean
  readonly colazione_30: boolean
  readonly colazione_01: boolean
  readonly sunset_29: boolean
  readonly sunset_30: boolean
  readonly consenso_dati: boolean
  readonly consenso_sponsor: boolean
  readonly qr_token: string
  readonly status: RegistrationStatus | null
}

export interface Checkin {
  readonly id: string
  readonly registration_id: string
  readonly event_type: string
  readonly event_day: string
  readonly checked_in_at: string
  readonly checked_out_at: string | null
  readonly operator_note: string | null
}

// Joined types for display
export interface ParcelWithRelations extends Parcel {
  readonly boat: Pick<Boat, 'id' | 'name'> | null
  readonly pickup_courier: Pick<Courier, 'id' | 'full_name'> | null
  readonly delivery_courier: Pick<Courier, 'id' | 'full_name'> | null
}

// Helper: strip readonly for Supabase compatibility (Record<string, unknown>)
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

// Supabase Database type for typed client
export interface Database {
  public: {
    Tables: {
      boats: {
        Row: Mutable<Boat>
        Insert: {
          name: string
          berth_location?: string | null
          captain_name?: string | null
          notes?: string | null
          id?: string
          created_at?: string
        }
        Update: {
          name?: string
          berth_location?: string | null
          captain_name?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      couriers: {
        Row: Mutable<Courier>
        Insert: {
          user_id: string
          full_name: string
          role: CourierRole
          phone?: string | null
          is_active?: boolean
          id?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          full_name?: string
          role?: CourierRole
          phone?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      parcels: {
        Row: Mutable<Parcel>
        Insert: {
          barcode?: string | null
          carrier?: string | null
          description?: string | null
          boat_id?: string | null
          status: ParcelStatus
          picked_up_by?: string | null
          picked_up_at?: string | null
          pickup_photo_url?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          delivered_by?: string | null
          delivered_at?: string | null
          delivery_photo_url?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          notes?: string | null
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          carrier?: string | null
          description?: string | null
          boat_id?: string | null
          status?: ParcelStatus
          picked_up_by?: string | null
          picked_up_at?: string | null
          pickup_photo_url?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          delivered_by?: string | null
          delivered_at?: string | null
          delivery_photo_url?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'parcels_boat_id_fkey'
            columns: ['boat_id']
            isOneToOne: false
            referencedRelation: 'boats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'parcels_picked_up_by_fkey'
            columns: ['picked_up_by']
            isOneToOne: false
            referencedRelation: 'couriers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'parcels_delivered_by_fkey'
            columns: ['delivered_by']
            isOneToOne: false
            referencedRelation: 'couriers'
            referencedColumns: ['id']
          },
        ]
      }
      registrations: {
        Row: Mutable<Registration>
        Insert: {
          nome: string
          cognome: string
          email: string
          telefono?: string | null
          azienda?: string | null
          ruolo?: string | null
          provenienza?: string | null
          colazione_29?: boolean
          colazione_30?: boolean
          colazione_01?: boolean
          sunset_29?: boolean
          sunset_30?: boolean
          consenso_dati: boolean
          consenso_sponsor?: boolean
          status?: RegistrationStatus | null
          id?: string
          created_at?: string
          qr_token?: string
        }
        Update: {
          nome?: string
          cognome?: string
          email?: string
          telefono?: string | null
          azienda?: string | null
          ruolo?: string | null
          provenienza?: string | null
          colazione_29?: boolean
          colazione_30?: boolean
          colazione_01?: boolean
          sunset_29?: boolean
          sunset_30?: boolean
          consenso_dati?: boolean
          consenso_sponsor?: boolean
          status?: RegistrationStatus | null
        }
        Relationships: []
      }
      checkins: {
        Row: Mutable<Checkin>
        Insert: {
          registration_id: string
          event_type: string
          event_day: string
          checked_out_at?: string | null
          operator_note?: string | null
          id?: string
          checked_in_at?: string
        }
        Update: {
          registration_id?: string
          event_type?: string
          event_day?: string
          checked_out_at?: string | null
          operator_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'checkins_registration_id_fkey'
            columns: ['registration_id']
            isOneToOne: false
            referencedRelation: 'registrations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      delete_registration: {
        Args: { reg_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
