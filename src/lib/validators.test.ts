import { describe, it, expect } from 'vitest'
import { loginSchema, pickupSchema, boatSchema, courierSchema } from './validators'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '123456' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-email', password: '123456' })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '123' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '123456' })
    expect(result.success).toBe(false)
  })
})

describe('pickupSchema', () => {
  it('accepts valid pickup data', () => {
    const result = pickupSchema.safeParse({
      barcode: 'ABC123',
      boat_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty barcode', () => {
    const result = pickupSchema.safeParse({
      barcode: '',
      boat_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-uuid boat_id', () => {
    const result = pickupSchema.safeParse({
      barcode: 'ABC123',
      boat_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional carrier and notes', () => {
    const result = pickupSchema.safeParse({
      barcode: 'ABC123',
      boat_id: '550e8400-e29b-41d4-a716-446655440000',
      carrier: 'DHL',
      notes: 'Fragile',
    })
    expect(result.success).toBe(true)
  })
})

describe('boatSchema', () => {
  it('accepts valid boat data', () => {
    const result = boatSchema.safeParse({ name: 'M/Y Lady Nora' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = boatSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = boatSchema.safeParse({
      name: 'M/Y Lady Nora',
      berth_location: 'Port Adriano, Berth 42',
      captain_name: 'Capt. James Morrison',
      notes: 'Some notes',
    })
    expect(result.success).toBe(true)
  })
})

describe('courierSchema', () => {
  it('accepts valid courier data', () => {
    const result = courierSchema.safeParse({
      email: 'marco@estela.com',
      full_name: 'Marco Rossi',
      password: '123456',
      role: 'courier',
    })
    expect(result.success).toBe(true)
  })

  it('accepts admin role', () => {
    const result = courierSchema.safeParse({
      email: 'admin@estela.com',
      full_name: 'Admin User',
      password: '123456',
      role: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = courierSchema.safeParse({
      email: 'test@estela.com',
      full_name: 'Test User',
      password: '123456',
      role: 'manager',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty full_name', () => {
    const result = courierSchema.safeParse({
      email: 'test@estela.com',
      full_name: '',
      password: '123456',
      role: 'courier',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = courierSchema.safeParse({
      email: 'test@estela.com',
      full_name: 'Test User',
      password: '12',
      role: 'courier',
    })
    expect(result.success).toBe(false)
  })
})
