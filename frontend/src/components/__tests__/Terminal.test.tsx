import { render } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Terminal, type TerminalHandle } from '../Terminal'

describe('Terminal', () => {
  it('renders without crashing', () => {
    const ref = createRef<TerminalHandle>()
    const { container } = render(
      <Terminal ref={ref} onInput={() => {}} onOutput={vi.fn()} />,
    )
    expect(container).toBeInTheDocument()
  })

  it('exposes interface via ref', () => {
    const ref = createRef<TerminalHandle>()
    render(<Terminal ref={ref} onInput={() => {}} onOutput={vi.fn()} />)
    expect(ref.current).toBeDefined()
    expect(typeof ref.current?.clear).toBe('function')
    expect(typeof ref.current?.focus).toBe('function')
  })
})
