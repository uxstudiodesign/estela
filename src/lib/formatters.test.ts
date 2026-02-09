import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime, truncate } from './formatters'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Just now" for less than 1 minute ago', () => {
    expect(formatRelativeTime('2025-06-15T11:59:30Z')).toBe('Just now')
  })

  it('returns minutes for less than 1 hour ago', () => {
    expect(formatRelativeTime('2025-06-15T11:45:00Z')).toBe('15m ago')
  })

  it('returns hours for less than 24 hours ago', () => {
    expect(formatRelativeTime('2025-06-15T06:00:00Z')).toBe('6h ago')
  })

  it('returns "Yesterday" for 1 day ago', () => {
    expect(formatRelativeTime('2025-06-14T12:00:00Z')).toBe('Yesterday')
  })

  it('returns days for 2-6 days ago', () => {
    expect(formatRelativeTime('2025-06-12T12:00:00Z')).toBe('3d ago')
  })

  it('returns formatted date for 7+ days ago', () => {
    const result = formatRelativeTime('2025-06-01T12:00:00Z')
    expect(result).toContain('Jun')
    expect(result).toContain('1')
    expect(result).toContain('2025')
  })
})

describe('truncate', () => {
  it('returns original text if shorter than max', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })

  it('returns original text if exactly max length', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('truncates and adds ellipsis if longer than max', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('')
  })
})
