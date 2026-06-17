import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NasmPanel } from '../NasmPanel'

describe('NasmPanel', () => {
  it('shows idle message when state is idle', () => {
    render(<NasmPanel state="idle" />)
    expect(screen.getByText(/Compile seu código para ver o assembly gerado/i)).toBeInTheDocument()
  })

  it('shows compiling spinner when state is compiling', () => {
    render(<NasmPanel state="compiling" />)
    expect(screen.getByText(/compilando/i)).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows error log when state is infra-error', () => {
    render(<NasmPanel state="infra-error" errorLog="erro: undefined symbol 'main'" />)
    expect(screen.getByText("erro: undefined symbol 'main'")).toBeInTheDocument()
  })

  it('shows default error message when errorLog is not provided', () => {
    render(<NasmPanel state="infra-error" />)
    expect(screen.getByText(/erro desconhecido no toolchain/i)).toBeInTheDocument()
  })

  it('renders monaco editor when state is success', () => {
    render(<NasmPanel state="success" asm="global _start" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
  })

  it('renders asm content in editor when state is success', () => {
    render(<NasmPanel state="success" asm="global _start" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect((editor as HTMLTextAreaElement).value).toBe('global _start')
  })

  it('renders empty editor when state is success and no asm provided', () => {
    render(<NasmPanel state="success" />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect((editor as HTMLTextAreaElement).value).toBe('')
  })
})
