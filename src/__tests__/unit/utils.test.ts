import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class active-class')
  })

  it('should handle false conditions', () => {
    const isActive = false
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class')
  })

  it('should handle array of classes', () => {
    const result = cn(['base', 'text-sm'], 'text-lg')
    expect(result).toBe('base text-lg')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle null and undefined values', () => {
    const result = cn('base', null, undefined, 'end')
    expect(result).toBe('base end')
  })

  it('should merge Tailwind classes correctly', () => {
    const result = cn('text-red-500 hover:text-blue-500', 'text-green-500')
    expect(result).toBe('hover:text-blue-500 text-green-500')
  })
})