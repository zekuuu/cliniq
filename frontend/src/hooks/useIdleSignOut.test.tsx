import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIdleSignOut } from './useIdleSignOut'

vi.mock('../lib/api/mode', () => ({ apiMode: () => 'api' }))
vi.mock('../lib/api/http/auth', () => ({ keepAlive: () => Promise.reject(new Error('offline')) }))

describe('API idle sign-out', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps an actively used session open when a keep-alive fails', async () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const { result } = renderHook(() => useIdleSignOut(10, onTimeout))

    for (let minute = 0; minute < 12; minute++) {
      await act(() => vi.advanceTimersByTimeAsync(60_000))
      act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })))
    }

    expect(result.current.secondsLeft).toBeNull()
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
