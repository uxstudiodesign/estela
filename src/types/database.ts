export type ParcelStatus = 'picked_up' | 'delivered'
export type CourierRole = 'courier' | 'admin'

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

// Joined types for display
export interface ParcelWithRelations extends Parcel {
  readonly boat: Pick<Boat, 'id' | 'name'> | null
  readonly pickup_courier: Pick<Courier, 'id' | 'full_name'> | null
  readonly delivery_courier: Pick<Courier, 'id' | 'full_name'> | null
}

// Supabase Database type for typed client
export interface Database {
  public: {
    Tables: {
      boats: {
        Row: Boat
        Insert: Omit<Boat, 'id' | 'created_at'>
        Update: Partial<Omit<Boat, 'id' | 'created_at'>>
      }
      couriers: {
        Row: Courier
        Insert: Omit<Courier, 'id' | 'created_at'>
        Update: Partial<Omit<Courier, 'id' | 'created_at'>>
      }
      parcels: {
        Row: Parcel
        Insert: Omit<Parcel, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Parcel, 'id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
