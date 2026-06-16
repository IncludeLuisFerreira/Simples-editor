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

function writeBanner(term: XtermTerminal) {
  const c = '\x1b[1;36m'
  const r = '\x1b[0m'
  term.writeln('')
  term.writeln(`  ${c}\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510${r}`)
  term.writeln(`  ${c}\u2502${r}   \x1b[1;37mSIMPLES TERMINAL\x1b[0m              ${c}\u2502${r}`)
  term.writeln(`  ${c}\u2502${r}   Digite seu input e pressione Enter  ${c}\u2502${r}`)
  term.writeln(`  ${c}\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518${r}`)
  term.writeln('')
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal({ onInput, onOutput }, ref) {
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
        theme: { background: '#0a0a1a', foreground: '#e0e0e0', cursor: '#00bcd4' },
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
    }, [])

    useEffect(() => {
      const term = xtermRef.current
      if (!term) return

      const disposable = term.onData((data) => {
        if (data === '\r') {
          term.write('\r\n')
          onInput(bufferRef.current + '\n')
          bufferRef.current = ''
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
  }
)
