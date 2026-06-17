import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { SimplesEditor, type CompileMarker } from '../components/SimplesEditor'
import { NasmPanel } from '../components/NasmPanel'
import { Terminal, type TerminalHandle } from '../components/Terminal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAuth } from '../lib/auth'
import { useExecution } from '../hooks/useExecution'
import { CANONICAL_EXAMPLES } from '../lib/examples'

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
  const terminalRef = useRef<TerminalHandle>(null)
  const [selectedExample, setSelectedExample] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (execState === 'running') {
      terminalRef.current?.focus()
    } else if (execState === 'finished' && exitCode !== null) {
      if (exitCode === 0) {
        terminalRef.current?.writeMessage('Programa finalizado com sucesso.', 'success')
      } else {
        terminalRef.current?.writeMessage(
          `Programa finalizado com erro. Exit code: ${exitCode}`,
          'error',
        )
      }
    } else if (execState === 'timeout') {
      terminalRef.current?.writeMessage('Timeout: execução excedeu o limite de tempo.', 'timeout')
    } else if (execState === 'error' && execError) {
      terminalRef.current?.writeMessage(`Erro: ${execError}`, 'error')
    }
  }, [execState, exitCode, execError])

  function resetEditorState(exampleCode: string) {
    setCode(exampleCode)
    setNasmState('idle')
    setNasmAsm('')
    setNasmErrorLog('')
    setMarkers([])
    setInfraError(null)
  }

  function handleExampleSelect(key: string) {
    if (!key) return
    const example = CANONICAL_EXAMPLES.find((e) => e.key === key)
    if (!example) return

    if (code.trim().length > 0) {
      setSelectedExample(key)
      setConfirmOpen(true)
    } else {
      resetEditorState(example.code)
      setSelectedExample('')
    }
  }

  function handleConfirmLoad() {
    const example = CANONICAL_EXAMPLES.find((e) => e.key === selectedExample)
    if (example) {
      resetEditorState(example.code)
    }
    setConfirmOpen(false)
    setSelectedExample('')
  }

  function handleCancelLoad() {
    setConfirmOpen(false)
    setSelectedExample('')
  }

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
      <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1a2e] border-b border-[#0f3460]">
        <button
          onClick={handleRun}
          disabled={
            isCompiling ||
            !session ||
            execState === 'running' ||
            execState === 'connecting' ||
            execState === 'stopping'
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
        <select
          value={selectedExample}
          onChange={(e) => handleExampleSelect(e.target.value)}
          className="px-3 py-1.5 bg-[#0f3460] border border-[#1a5276] rounded text-sm text-gray-200 hover:border-cyan-500 focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
          aria-label="Carregar exemplo"
        >
          <option value="" disabled>
            📂 Exemplos...
          </option>
          {CANONICAL_EXAMPLES.map((ex) => (
            <option key={ex.key} value={ex.key}>
              {ex.label}
            </option>
          ))}
        </select>
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
        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border-b border-red-700 text-red-300 text-sm animate-[slideDown_0.2s_ease-out]">
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
          <SimplesEditor
            value={code}
            onChange={setCode}
            readOnly={isCompiling || execState === 'running'}
            markers={markers}
          />
        </Panel>
        <PanelResizeHandle className="w-1 bg-[#0f3460] hover:bg-cyan-700 transition-colors cursor-col-resize" />
        <Panel defaultSize={45} minSize={20}>
          <NasmPanel state={nasmState} asm={nasmAsm} errorLog={nasmErrorLog} />
        </Panel>
      </PanelGroup>
      <div className="h-52 border-t border-[#0f3460]">
        <Terminal ref={terminalRef} onInput={sendInput} onOutput={registerOutput} />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Substituir código?"
        message="O editor já contém código. Carregar um exemplo substituirá o conteúdo atual."
        onConfirm={handleConfirmLoad}
        onCancel={handleCancelLoad}
      />
    </div>
  )
}
