import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let wsInstance: {
  readyState: number
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  onopen: (() => void) | null
  onmessage: ((e: { data: string }) => void) | null
  onerror: (() => void) | null
  onclose: ((e: { code: number; wasClean: boolean }) => void) | null
} | null = null

vi.mock('../../lib/auth', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token', expires_at: 9999999999 },
  }),
}))

import { useExecution } from '../useExecution'

describe('useExecution', () => {
  beforeEach(() => {
    wsInstance = null
    vi.clearAllMocks()

    window.WebSocket = vi.fn(function () {
      wsInstance = {
        readyState: WebSocket.OPEN,
        send: vi.fn(),
        close: vi.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      }
      return wsInstance
    }) as never
  })

  function connectAndRun(result: ReturnType<typeof renderHook<ReturnType<typeof useExecution>>>) {
    act(() => {
      result.current.execute('binary_key')
    })
    act(() => {
      wsInstance!.onopen?.()
    })
  }

  it('starts in idle state', () => {
    const { result } = renderHook(() => useExecution())
    expect(result.current.state).toBe('idle')
    expect(result.current.exitCode).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('transitions from idle to connecting to running', () => {
    const { result } = renderHook(() => useExecution())

    act(() => {
      result.current.execute('binary_key')
    })
    expect(result.current.state).toBe('connecting')

    act(() => {
      wsInstance!.onopen?.()
    })
    expect(result.current.state).toBe('running')
  })

  it('creates WebSocket with auth token', () => {
    const { result } = renderHook(() => useExecution())
    act(() => {
      result.current.execute('binary_key')
    })
    expect(window.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('token=test-token'),
    )
  })

  it('sends execute message after connect', () => {
    const { result } = renderHook(() => useExecution())
    act(() => {
      result.current.execute('binary_key')
    })
    act(() => {
      wsInstance!.onopen?.()
    })
    expect(wsInstance!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'execute', binary_key: 'binary_key' }),
    )
  })

  it('forwards output messages to registered callback', () => {
    const { result } = renderHook(() => useExecution())
    const onOutput = vi.fn()

    act(() => {
      result.current.registerOutput(onOutput)
    })

    connectAndRun(result)

    act(() => {
      wsInstance!.onmessage!({ data: JSON.stringify({ type: 'output', data: 'ola mundo\n' }) })
    })
    expect(onOutput).toHaveBeenCalledWith('ola mundo\n')
  })

  it('forwards error messages with ANSI red prefix', () => {
    const { result } = renderHook(() => useExecution())
    const onOutput = vi.fn()

    act(() => {
      result.current.registerOutput(onOutput)
    })

    connectAndRun(result)

    act(() => {
      wsInstance!.onmessage!({ data: JSON.stringify({ type: 'error', data: 'segmentation fault' }) })
    })
    expect(onOutput).toHaveBeenCalledWith('\x1b[31msegmentation fault\x1b[0m')
  })

  it('transitions to finished on exit message', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      wsInstance!.onmessage!({ data: JSON.stringify({ type: 'exit', code: 0 }) })
    })
    expect(result.current.state).toBe('finished')
    expect(result.current.exitCode).toBe(0)
  })

  it('transitions to timeout on timeout message', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      wsInstance!.onmessage!({ data: JSON.stringify({ type: 'timeout', limit_s: 10 }) })
    })
    expect(result.current.state).toBe('timeout')
    expect(result.current.exitCode).toBe(-1)
    expect(result.current.error).toBe('Timeout (10s)')
  })

  it('sends input when sendInput is called', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      result.current.sendInput('42\n')
    })
    expect(wsInstance!.send).toHaveBeenCalledWith(JSON.stringify({ type: 'input', data: '42\n' }))
  })

  it('sends stop and transitions to stopping', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      result.current.stop()
    })
    expect(wsInstance!.send).toHaveBeenCalledWith(JSON.stringify({ type: 'stop' }))
    expect(result.current.state).toBe('stopping')
  })

  it('handles websocket error', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      wsInstance!.onerror?.()
    })
    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Connection error')
  })

  it('handles close with auth failure code 4001', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      wsInstance!.onclose?.({ code: 4001, wasClean: false })
    })
    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Authentication failed')
  })

  it('handles unclean close with generic error', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      wsInstance!.onclose?.({ code: 1006, wasClean: false })
    })
    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Connection closed (1006)')
  })

  it('handles clean close without error', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    act(() => {
      wsInstance!.onclose?.({ code: 1000, wasClean: true })
    })
    expect(result.current.state).toBe('running')
  })

  it('ignores malformed JSON messages', () => {
    const { result } = renderHook(() => useExecution())
    const onOutput = vi.fn()

    act(() => {
      result.current.registerOutput(onOutput)
    })

    connectAndRun(result)

    act(() => {
      wsInstance!.onmessage!({ data: 'not-valid-json' })
    })
    expect(result.current.state).toBe('running')
    expect(onOutput).not.toHaveBeenCalled()
  })

  it('closes previous WebSocket on new execute', () => {
    const { result } = renderHook(() => useExecution())

    connectAndRun(result)

    const firstWs = wsInstance

    act(() => {
      result.current.execute('another_key')
    })
    expect(firstWs!.close).toHaveBeenCalled()
    expect(wsInstance).not.toBe(firstWs)
  })
})
