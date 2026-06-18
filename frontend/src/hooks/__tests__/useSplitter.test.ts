import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useSplitter } from '../useSplitter'

describe('useSplitter', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns default initial ratio', () => {
    const { result } = renderHook(() => useSplitter())
    expect(result.current.ratio).toBe(0.6)
    expect(result.current.collapsed).toBe(false)
  })

  it('accepts custom initialRatio', () => {
    const { result } = renderHook(() => useSplitter({ initialRatio: 0.7 }))
    expect(result.current.ratio).toBe(0.7)
  })

  it('toggles collapsed on double click', () => {
    const { result } = renderHook(() => useSplitter())

    act(() => {
      result.current.onDoubleClick()
    })
    expect(result.current.collapsed).toBe(true)

    act(() => {
      result.current.onDoubleClick()
    })
    expect(result.current.collapsed).toBe(false)
  })

  it('restores last ratio when uncollapsing', () => {
    const { result } = renderHook(() => useSplitter({ initialRatio: 0.65 }))

    act(() => {
      result.current.onDoubleClick()
    })
    expect(result.current.collapsed).toBe(true)

    act(() => {
      result.current.onDoubleClick()
    })
    expect(result.current.collapsed).toBe(false)
    expect(result.current.ratio).toBe(0.65)
  })

  it('persists collapse state to localStorage', () => {
    const { result } = renderHook(() => useSplitter({ storageKey: 'my-key' }))

    act(() => {
      result.current.onDoubleClick()
    })

    const stored = localStorage.getItem('my-key')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.collapsed).toBe(true)
    expect(typeof parsed.ratio).toBe('number')
  })

  it('loads saved state from localStorage', () => {
    localStorage.setItem('loaded-key', JSON.stringify({ ratio: 0.45, collapsed: true }))

    const { result } = renderHook(() => useSplitter({ storageKey: 'loaded-key' }))
    expect(result.current.ratio).toBe(0.45)
    expect(result.current.collapsed).toBe(true)
  })

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('bad-key', '{invalid}')
    const { result } = renderHook(() => useSplitter({ storageKey: 'bad-key', initialRatio: 0.55 }))
    expect(result.current.ratio).toBe(0.55)
  })

  it('provides containerRef', () => {
    const { result } = renderHook(() => useSplitter())
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.containerRef.current).toBeNull()
  })

  it('exposes onMouseDown handler', () => {
    const { result } = renderHook(() => useSplitter())
    expect(typeof result.current.onMouseDown).toBe('function')
  })

  it('exposes onDoubleClick handler', () => {
    const { result } = renderHook(() => useSplitter())
    expect(typeof result.current.onDoubleClick).toBe('function')
  })
})
