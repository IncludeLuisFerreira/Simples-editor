import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  onInput: (data: string) => void
  onOutput: (cb: (data: string) => void) => void
}

export interface TerminalHandle {
  focus: () => void
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  function Terminal({ onInput, onOutput }, ref) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<XtermTerminal | null>(null)

    useImperativeHandle(ref, () => ({
      focus: () => xtermRef.current?.focus(),
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

      term.writeln('\x1b[1;36m╭─── Simples Terminal ═══════════════════╮\x1b[0m')
      term.writeln('\x1b[1;36m│\x1b[0m  Compile seu código e clique Run       \x1b[1;36m│\x1b[0m')
      term.writeln('\x1b[1;36m╰──────────────────────────────────────────╯\x1b[0m')
      term.writeln('')

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
        const normalized = data.replace(/\r\n?/g, '\n')
        term.write(data)
        onInput(normalized)
      })

      return () => {
        disposable.dispose()
      }
    }, [onInput])

    return <div ref={terminalRef} className="h-full w-full" />
  }
)
