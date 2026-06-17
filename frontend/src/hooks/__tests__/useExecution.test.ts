import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wsInstance: Record<string, any> | null = null

vi.mock('../../lib/auth', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAuth: () => ({ session: { access_token: 'test-token' } } as any),
}))

import { useExecution } from '../useExecution'

describe('useExecution', () => {
  beforeEach(() => {
    wsInstance = null
    global.WebSocket = vi.fn().mockImplementation(function () {
      wsInstance = {
        readyState: WebSocket.OPEN,
        send: vi.fn(),
        close: vi.fn(),
      }
      return wsInstance
    })
    vi.clearAllMocks()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useExecution())
    expect(result.current.state).toBe('idle')
  })

  it('transitions through states on execute', () => {
    const { result } = renderHook(() => useExecution())
    act(() => {
      result.current.execute('binary_key')
    })
    expect(result.current.state).toBe('connecting')

    act(() => {
      wsInstance!.onopen()
    })
    expect(result.current.state).toBe('running')
  })

  it('outputs data when receiving output message', () => {
    const { result } = renderHook(() => useExecution())
    const onOutput = vi.fn()
    result.current.registerOutput(onOutput)
    act(() => { result.current.execute('binary_key') })
    act(() => { wsInstance!.onopen() })

    act(() => {
      wsInstance!.onmessage({ data: JSON.stringify({ type: 'output', data: 'hello\n' }) })
    })
    expect(onOutput).toHaveBeenCalledWith('hello\n')
  })

  it('transitions to finished on exit message', () => {
    const { result } = renderHook(() => useExecution())
    act(() => { result.current.execute('binary_key') })
    act(() => { wsInstance!.onopen() })

    act(() => {
      wsInstance!.onmessage({ data: JSON.stringify({ type: 'exit', code: 0 }) })
    })
    expect(result.current.state).toBe('finished')
  })

  it('transitions to timeout on timeout message', () => {
    const { result } = renderHook(() => useExecution())
    act(() => { result.current.execute('binary_key') })
    act(() => { wsInstance!.onopen() })

    act(() => {
      wsInstance!.onmessage({ data: JSON.stringify({ type: 'timeout', limit_s: 10 }) })
    })
    expect(result.current.state).toBe('timeout')
  })

  it('sends input when sendInput is called', () => {
    const { result } = renderHook(() => useExecution())
    act(() => { result.current.execute('binary_key') })
    act(() => { wsInstance!.onopen() })

    act(() => { result.current.sendInput('42\n') })
    expect(wsInstance!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'input', data: '42\n' }),
    )
  })

  it('sends stop when stop is called', () => {
    const { result } = renderHook(() => useExecution())
    act(() => { result.current.execute('binary_key') })
    act(() => { wsInstance!.onopen() })

    act(() => { result.current.stop() })
    expect(wsInstance!.send).toHaveBeenCalledWith(JSON.stringify({ type: 'stop' }))
  })
})
