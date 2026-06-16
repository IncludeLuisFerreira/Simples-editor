import { useReducer, useRef, useCallback } from 'react'
import { useAuth } from '../lib/auth'

type ExecutionState = 'idle' | 'connecting' | 'running' | 'stopping' | 'finished' | 'error' | 'timeout'

type ExecutionAction =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'RUN' }
  | { type: 'STOP' }
  | { type: 'EXIT'; code: number }
  | { type: 'TIMEOUT' }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }

interface ExecutionStateData {
  state: ExecutionState
  exitCode: number | null
  error: string | null
}

function executionReducer(s: ExecutionStateData, action: ExecutionAction): ExecutionStateData {
  switch (action.type) {
    case 'CONNECT':
      return { state: 'connecting', exitCode: null, error: null }
    case 'CONNECTED':
      return { state: 'running', exitCode: null, error: null }
    case 'RUN':
      return { state: 'running', exitCode: null, error: null }
    case 'STOP':
      return { state: 'stopping', exitCode: null, error: null }
    case 'EXIT':
      return { state: 'finished', exitCode: action.code, error: null }
    case 'TIMEOUT':
      return { state: 'timeout', exitCode: -1, error: 'Timeout (10s)' }
    case 'ERROR':
      return { state: 'error', exitCode: null, error: action.message }
    case 'RESET':
      return { state: 'idle', exitCode: null, error: null }
  }
}

interface ExecutionContext {
  state: ExecutionState
  exitCode: number | null
  error: string | null
  registerOutput: (cb: (data: string) => void) => void
  execute: (binaryKey: string) => void
  sendInput: (data: string) => void
  stop: () => void
}

export function useExecution(): ExecutionContext {
  const { session } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const outputCallbackRef = useRef<((data: string) => void) | null>(null)

  const [stateData, dispatch] = useReducer(executionReducer, {
    state: 'idle',
    exitCode: null,
    error: null,
  } as ExecutionStateData)

  const registerOutput = useCallback((cb: (data: string) => void) => {
    outputCallbackRef.current = cb
  }, [])

  const connect = useCallback(
    (binaryKey: string) => {
      if (!session) return
      dispatch({ type: 'CONNECT' })

      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/run?token=${session.access_token}`)
      wsRef.current = ws

      ws.onopen = () => {
        dispatch({ type: 'CONNECTED' })
        ws.send(JSON.stringify({ type: 'execute', binary_key: binaryKey }))
        dispatch({ type: 'RUN' })
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          switch (msg.type) {
            case 'output':
              outputCallbackRef.current?.(msg.data)
              break
            case 'error':
              outputCallbackRef.current?.(`\x1b[31m${msg.data}\x1b[0m`)
              break
            case 'exit':
              dispatch({ type: 'EXIT', code: msg.code })
              break
            case 'timeout':
              dispatch({ type: 'TIMEOUT' })
              break
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onerror = () => dispatch({ type: 'ERROR', message: 'Connection error' })

      ws.onclose = (e) => {
        if (e.code === 4001) {
          dispatch({ type: 'ERROR', message: 'Authentication failed' })
        } else if (!e.wasClean) {
          dispatch({ type: 'ERROR', message: `Connection closed (${e.code})` })
        }
      }
    },
    [session]
  )

  const execute = useCallback(
    (binaryKey: string) => {
      connect(binaryKey)
    },
    [connect]
  )

  const sendInput = useCallback((data: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'input', data }))
  }, [])

  const stop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'stop' }))
    dispatch({ type: 'STOP' })
  }, [])

  return {
    state: stateData.state,
    exitCode: stateData.exitCode,
    error: stateData.error,
    registerOutput,
    execute,
    sendInput,
    stop,
  }
}
