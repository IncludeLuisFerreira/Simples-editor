import '@testing-library/jest-dom'
import { vi } from 'vitest'
import type React from 'react'

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options, readOnly }: Record<string, unknown>) => {
    return (
      <textarea
        data-testid="monaco-editor"
        value={(value as string) ?? ''}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          (onChange as (v: string) => void)?.(e.target.value)
        }
        readOnly={
          ((options as Record<string, unknown>)?.readOnly as boolean) ??
          (readOnly as boolean) ??
          false
        }
      />
    )
  },
  beforeMount: vi.fn(),
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(function (this: Record<string, unknown>) {
    this.open = vi.fn()
    this.write = vi.fn()
    this.writeln = vi.fn()
    this.onData = vi.fn(() => ({ dispose: vi.fn() }))
    this.dispose = vi.fn()
    this.loadAddon = vi.fn()
    this.focus = vi.fn()
    this.element = document.createElement('div')
  }),
}))

vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: Record<string, unknown>) => <div>{children as React.ReactNode}</div>,
  PanelGroup: ({ children }: Record<string, unknown>) => <div>{children as React.ReactNode}</div>,
  PanelResizeHandle: () => <div />,
}))
