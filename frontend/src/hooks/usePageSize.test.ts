import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePageSize } from './usePageSize'

describe('usePageSize', () => {
  it('starts every list at 10 rows, and at 10 again when the list opens again', () => {
    const first = renderHook(() => usePageSize())
    expect(first.result.current[0]).toBe(10)
    act(() => first.result.current[1](50))
    expect(first.result.current[0]).toBe(50)
    first.unmount()
    expect(renderHook(() => usePageSize()).result.current[0]).toBe(10)
    expect(window.sessionStorage.length).toBe(0)
  })
})
