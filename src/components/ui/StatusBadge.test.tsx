import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders "Picked Up" for picked_up status', () => {
    render(<StatusBadge status="picked_up" />)
    expect(screen.getByText('Picked Up')).toBeInTheDocument()
  })

  it('renders "Delivered" for delivered status', () => {
    render(<StatusBadge status="delivered" />)
    expect(screen.getByText('Delivered')).toBeInTheDocument()
  })

  it('applies navy classes for picked_up', () => {
    render(<StatusBadge status="picked_up" />)
    const badge = screen.getByText('Picked Up')
    expect(badge.className).toContain('text-navy')
  })

  it('applies success classes for delivered', () => {
    render(<StatusBadge status="delivered" />)
    const badge = screen.getByText('Delivered')
    expect(badge.className).toContain('text-success')
  })
})
