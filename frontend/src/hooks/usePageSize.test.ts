import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePageSize } from './usePageSize'

describe('usePageSize', () => {
  it('starts every pager at 10 rows, and at 10 again when the stored value is not an option', () => {
    expect(renderHook(() => usePageSize()).result.current[0]).toBe(10)
    window.sessionStorage.setItem('cliniq.pageSize', '80')
    expect(renderHook(() => usePageSize()).result.current[0]).toBe(10)
  })

  it('keeps another choice for the session', () => {
    const first = renderHook(() => usePageSize())
    act(() => first.result.current[1](50))
    expect(first.result.current[0]).toBe(50)
    expect(renderHook(() => usePageSize()).result.current[0]).toBe(50)
  })
})
