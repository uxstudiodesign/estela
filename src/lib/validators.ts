import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const pickupSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  boat_id: z.string().uuid('Select a boat'),
  carrier: z.string().optional(),
  notes: z.string().optional(),
})

export type PickupFormData = z.infer<typeof pickupSchema>

export const boatSchema = z.object({
  name: z.string().min(1, 'Boat name is required'),
  berth_location: z.string().optional(),
  captain_name: z.string().optional(),
  notes: z.string().optional(),
})

export type BoatFormData = z.infer<typeof boatSchema>

export const courierSchema = z.object({
  email: z.string().email('Invalid email'),
  full_name: z.string().min(1, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['courier', 'admin']),
})

export type CourierFormData = z.infer<typeof courierSchema>
