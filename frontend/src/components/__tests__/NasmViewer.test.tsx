import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NasmViewer } from '../NasmViewer'

describe('NasmViewer', () => {
  it('renders editor with asm content', () => {
    render(<NasmViewer asm="mov eax, 1" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect((editor as HTMLTextAreaElement).value).toBe('mov eax, 1')
  })

  it('renders editor in readOnly mode', () => {
    render(<NasmViewer asm="section .text" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveAttribute('readOnly')
  })

  it('renders with empty asm', () => {
    render(<NasmViewer asm="" />)
    const editor = screen.getByTestId('monaco-editor')
    expect((editor as HTMLTextAreaElement).value).toBe('')
  })
})
