import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NasmPanel } from '../NasmPanel'

describe('NasmPanel', () => {
  it('shows idle message when state is idle', () => {
    render(<NasmPanel state="idle" />)
    expect(screen.getByText(/Compile seu código/i)).toBeInTheDocument()
  })

  it('shows compiling spinner when state is compiling', () => {
    render(<NasmPanel state="compiling" />)
    expect(screen.getByText(/compilando/i)).toBeInTheDocument()
  })

  it('shows error log when state is infra-error', () => {
    render(<NasmPanel state="infra-error" errorLog="erro de compilacao" />)
    expect(screen.getByText('erro de compilacao')).toBeInTheDocument()
  })

  it('shows monaco editor when state is success', () => {
    render(<NasmPanel state="success" asm="section .text" />)
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    expect(screen.getByTestId('monaco-editor')).toHaveValue('section .text')
  })

  it('shows default error when errorLog is not provided', () => {
    render(<NasmPanel state="infra-error" />)
    expect(screen.getByText(/erro desconhecido/i)).toBeInTheDocument()
  })
})
