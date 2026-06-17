import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  onInput: (data: string) => void
  onOutput: (cb: (data: string) => void) => void
}

export interface TerminalHandle {
  focus: () => void
  clear: () => void
}

const MARGIN = '      '

function writeBanner(term: XtermTerminal) {
  const c = '\x1b[1;36m'
  const r = '\x1b[0m'
  const w = 44
  const border = '\u2500'.repeat(w)
  const indent = '   '

  const text1 = 'SIMPLES TERMINAL'
  const text2 = 'Digite seu input e pressione Enter'
  const pad1 = w - (indent + text1).length
  const pad2 = w - (indent + text2).length

  term.writeln('')
  term.writeln(`${MARGIN}${c}\u250c${border}\u2510${r}`)
  term.writeln(
    `${MARGIN}${c}\u2502${r}${indent}\x1b[1;37m${text1}\x1b[0m${' '.repeat(pad1)}${c}\u2502${r}`,
  )
  term.writeln(`${MARGIN}${c}\u2502${r}${indent}${text2}${' '.repeat(pad2)}${c}\u2502${r}`)
  term.writeln(`${MARGIN}${c}\u2514${border}\u2518${r}`)
  term.writeln('')
  term.write(MARGIN)
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  { onInput, onOutput },
  ref,
) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XtermTerminal | null>(null)
  const bufferRef = useRef('')

  useImperativeHandle(ref, () => ({
    focus: () => xtermRef.current?.focus(),
    clear: () => {
      const term = xtermRef.current
      if (!term) return
      term.write('\x1b[2J\x1b[H')
      bufferRef.current = ''
      writeBanner(term)
    },
  }))

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new XtermTerminal({
      theme: { background: '#1a1a2e', foreground: '#e0e0e0', cursor: '#00bcd4' },
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      cursorBlink: true,
      cols: 80,
      rows: 12,
    })
    term.open(terminalRef.current)
    xtermRef.current = term

    writeBanner(term)

    onOutput((data: string) => {
      term.write(data)
    })

    return () => {
      term.dispose()
    }
  }, [onOutput])

  useEffect(() => {
    const term = xtermRef.current
    if (!term) return

    const disposable = term.onData((data) => {
      if (data === '\r') {
        term.write('\r\n')
        onInput(bufferRef.current + '\n')
        bufferRef.current = ''
        term.write(MARGIN)
        return
      }
      if (data === '\x7f' || data === '\b') {
        if (bufferRef.current.length > 0) {
          bufferRef.current = bufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
        return
      }
      bufferRef.current += data
      term.write(data)
    })

    return () => {
      disposable.dispose()
    }
  }, [onInput])

  return <div ref={terminalRef} className="h-full w-full" />
})
