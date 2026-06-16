import { useEffect, useRef } from 'react'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  onInput: (data: string) => void
  onOutput: (cb: (data: string) => void) => void
}

export function Terminal({ onInput, onOutput }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XtermTerminal | null>(null)

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
      onInput(data)
    })

    return () => {
      disposable.dispose()
    }
  }, [onInput])

  return <div ref={terminalRef} className="h-full w-full" />
}
