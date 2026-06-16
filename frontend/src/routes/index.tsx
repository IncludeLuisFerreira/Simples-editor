import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { SimplesEditor, type CompileMarker } from '../components/SimplesEditor'
import { NasmPanel } from '../components/NasmPanel'
import { Terminal, type TerminalHandle } from '../components/Terminal'
import { useAuth } from '../lib/auth'
import { useExecution } from '../hooks/useExecution'

export const Route = createFileRoute('/')({ component: Index })

type NasmState = 'idle' | 'compiling' | 'success' | 'infra-error'

const SIMPLESC_PHASES = new Set(['lexer', 'parser', 'semantic'])

function Index() {
  const { session } = useAuth()
  const [code, setCode] = useState('')
  const [isCompiling, setIsCompiling] = useState(false)
  const [nasmState, setNasmState] = useState<NasmState>('idle')
  const [nasmAsm, setNasmAsm] = useState('')
  const [nasmErrorLog, setNasmErrorLog] = useState('')
  const [markers, setMarkers] = useState<CompileMarker[]>([])
  const [infraError, setInfraError] = useState<string | null>(null)
  const {
    state: execState,
    exitCode,
    error: execError,
    registerOutput,
    execute,
    sendInput,
    stop,
  } = useExecution()
  const [binaryKey, setBinaryKey] = useState<string | null>(null)
  const terminalRef = useRef<TerminalHandle>(null)

  useEffect(() => {
    if (execState === 'running') {
      terminalRef.current?.focus()
    }
  }, [execState])

  async function handleRun() {
    if (!session || isCompiling) return
    terminalRef.current?.clear()
    setIsCompiling(true)
    setNasmState('compiling')
    setMarkers([])
    setInfraError(null)
    setNasmAsm('')
    setNasmErrorLog('')
    try {
      const resp = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      })
      const data: {
        asm?: string
        binary_key?: string
        error?: string
        phase?: string
        line?: number
        column?: number
      } = await resp.json()
      if (resp.ok && data.asm) {
        setNasmAsm(data.asm)
        setNasmState('success')
        if (data.binary_key) {
          setBinaryKey(data.binary_key)
          execute(data.binary_key)
        }
      } else {
        const phase = data.phase ?? ''
        if (SIMPLESC_PHASES.has(phase) && data.line != null && data.column != null) {
          setMarkers([{ line: data.line, column: data.column, message: data.error ?? '' }])
          setNasmState('idle')
        } else if (phase === 'nasm' || phase === 'ld') {
          const action = phase === 'nasm' ? 'montagem' : 'ligação'
          setNasmErrorLog(data.error ?? 'Erro desconhecido')
          setNasmState('infra-error')
          setInfraError(
            `Erro de Infraestrutura: Falha na ${action} do binário. Verifique o painel NASM para detalhes.`,
          )
        } else {
          setInfraError(data.error ?? 'Erro desconhecido ao compilar.')
          setNasmState('idle')
        }
      }
    } catch {
      setInfraError('Erro de rede ao contactar o servidor.')
      setNasmState('idle')
    } finally {
      setIsCompiling(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#16213e] border-b border-[#0f3460]">
        <button
          onClick={handleRun}
          disabled={
            isCompiling || !session || execState === 'running' || execState === 'connecting' || execState === 'stopping'
          }
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {isCompiling
            ? 'Compilando...'
            : execState === 'running'
              ? '▶ Executando...'
              : execState === 'connecting'
                ? 'Conectando...'
                : execState === 'stopping'
                  ? 'Parando...'
                  : '▶ Run'}
        </button>
        {execState === 'running' && (
          <>
            <button
              onClick={stop}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
            >
              ■ Stop
            </button>
            <span className="text-sm text-cyan-400 animate-pulse">⏳ Aguardando input...</span>
          </>
        )}
        {execState === 'finished' && exitCode !== null && (
          <span className={`text-sm ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
            Exit code: {exitCode}
          </span>
        )}
        {execState === 'timeout' && <span className="text-sm text-yellow-400">Timeout (10s)</span>}
        {execState === 'error' && execError && (
          <span className="text-sm text-red-400">{execError}</span>
        )}
      </div>
      {infraError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border-b border-red-700 text-red-300 text-sm">
          <span>⚠ {infraError}</span>
          <button
            onClick={() => setInfraError(null)}
            className="ml-auto text-red-400 hover:text-red-200 leading-none"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}
      <PanelGroup orientation="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={55} minSize={25}>
          <SimplesEditor value={code} onChange={setCode} readOnly={isCompiling || execState === 'running'} markers={markers} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-[#0f3460] hover:bg-cyan-700 transition-colors cursor-col-resize" />
        <Panel defaultSize={45} minSize={20}>
          <NasmPanel state={nasmState} asm={nasmAsm} errorLog={nasmErrorLog} />
        </Panel>
      </PanelGroup>
      <div className="h-48 border-t border-[#0f3460]">
        <Terminal ref={terminalRef} onInput={sendInput} onOutput={registerOutput} />
      </div>
    </div>
  )
}
