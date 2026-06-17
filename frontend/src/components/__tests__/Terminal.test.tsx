import { render, act } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  let capturedOnData: ((data: string) => void) | null = null
  let capturedDisposable: { dispose: () => void } | null = null
  const instanceWrite = vi.fn()
  const instanceWriteln = vi.fn()
  const instanceOpen = vi.fn()
  const instanceDispose = vi.fn()
  const instanceFocus = vi.fn()
  const instanceElement = document.createElement('div')

  return {
    capturedOnData: {
      get: () => capturedOnData,
      set: (v: ((data: string) => void) | null) => {
        capturedOnData = v
      },
    },
    capturedDisposable: {
      get: () => capturedDisposable,
      set: (v: { dispose: () => void } | null) => {
        capturedDisposable = v
      },
    },
    instanceWrite,
    instanceWriteln,
    instanceOpen,
    instanceDispose,
    instanceFocus,
    instanceElement,
  }
})

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(function (this: Record<string, unknown>) {
    mocks.capturedDisposable.set({ dispose: vi.fn() })
    this.open = mocks.instanceOpen
    this.write = mocks.instanceWrite
    this.writeln = mocks.instanceWriteln
    this.onData = vi.fn((cb: (data: string) => void) => {
      mocks.capturedOnData.set(cb)
      return mocks.capturedDisposable.get()
    })
    this.dispose = mocks.instanceDispose
    this.loadAddon = vi.fn()
    this.focus = mocks.instanceFocus
    this.element = mocks.instanceElement
  }),
}))

import { Terminal, type TerminalHandle } from '../Terminal'

describe('Terminal', () => {
  beforeEach(() => {
    mocks.capturedOnData.set(null)
    mocks.capturedDisposable.set(null)
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const ref = createRef<TerminalHandle>()
    const { container } = render(<Terminal ref={ref} onInput={() => {}} onOutput={vi.fn()} />)
    expect(container).toBeInTheDocument()
  })

  it('opens xterm in container element', () => {
    const { container } = render(<Terminal onInput={() => {}} onOutput={vi.fn()} />)
    const terminalDiv = container.querySelector('div')
    expect(terminalDiv).toBeInTheDocument()
    expect(mocks.instanceOpen).toHaveBeenCalledWith(terminalDiv)
  })

  it('exposes focus and clear methods via ref', () => {
    const ref = createRef<TerminalHandle>()
    render(<Terminal ref={ref} onInput={() => {}} onOutput={vi.fn()} />)
    expect(ref.current).toBeDefined()
    expect(typeof ref.current!.focus).toBe('function')
    expect(typeof ref.current!.clear).toBe('function')
  })

  it('clear writes escape sequence and banner', () => {
    const ref = createRef<TerminalHandle>()
    render(<Terminal ref={ref} onInput={() => {}} onOutput={vi.fn()} />)

    act(() => {
      ref.current!.clear()
    })

    expect(mocks.instanceWrite).toHaveBeenCalledWith('\x1b[2J\x1b[H')
    const bannerCall = mocks.instanceWriteln.mock.calls.find(
      (call: string[]) => typeof call[0] === 'string' && call[0].includes('SIMPLES TERMINAL'),
    )
    expect(bannerCall).toBeDefined()
  })

  it('sends input with newline on enter key', async () => {
    const onInput = vi.fn()
    render(<Terminal onInput={onInput} onOutput={vi.fn()} />)

    await act(async () => {
      const onData = mocks.capturedOnData.get()
      onData?.('4')
      onData?.('2')
      onData?.('\r')
    })

    expect(onInput).toHaveBeenCalledWith('42\n')
  })

  it('handles backspace by removing last character from buffer', async () => {
    const onInput = vi.fn()
    render(<Terminal onInput={onInput} onOutput={vi.fn()} />)

    await act(async () => {
      const onData = mocks.capturedOnData.get()
      onData?.('a')
      onData?.('b')
      onData?.('\x7f')
      onData?.('c')
      onData?.('\r')
    })

    expect(onInput).toHaveBeenCalledWith('ac\n')
  })

  it('registers output callback that writes to terminal', async () => {
    let outputCallback: ((data: string) => void) | null = null
    render(
      <Terminal
        onInput={() => {}}
        onOutput={(cb) => {
          outputCallback = cb
        }}
      />,
    )

    act(() => {
      outputCallback?.('programa executando...\n')
    })

    expect(mocks.instanceWrite).toHaveBeenCalledWith('programa executando...\n')
  })

  it('disposes terminal on unmount', () => {
    const { unmount } = render(<Terminal onInput={() => {}} onOutput={vi.fn()} />)
    unmount()
    expect(mocks.instanceDispose).toHaveBeenCalled()
  })

  it('disposes onData subscription on unmount', () => {
    const { unmount } = render(<Terminal onInput={() => {}} onOutput={vi.fn()} />)
    unmount()
    expect(mocks.capturedDisposable.get()!.dispose).toHaveBeenCalled()
  })

  it('writes banner on mount', () => {
    render(<Terminal onInput={() => {}} onOutput={vi.fn()} />)
    const writelnCalls = mocks.instanceWriteln.mock.calls.map((c: string[]) => c[0])
    const bannerContent = writelnCalls.find((s: string) => s.includes('SIMPLES TERMINAL'))
    expect(bannerContent).toBeDefined()
  })
})
