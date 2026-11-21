import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// setup.ts replaces the hook with a pass-through; this file checks the real one.
const { useDebouncedValue } =
  await vi.importActual<typeof import('./useDebouncedValue')>('./useDebouncedValue')

afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('keeps the old value while typing and settles 250ms after the last change', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: '' },
    })
    rerender({ value: 'a' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'an' })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(50))
    expect(result.current).toBe('an')
  })
})
