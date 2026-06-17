import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SimplesEditor, type CompileMarker } from '../SimplesEditor'

describe('SimplesEditor', () => {
  it('renders editor with initial value', () => {
    render(<SimplesEditor value="programa exemplo" onChange={() => {}} />)
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement
    expect(editor).toBeInTheDocument()
    expect(editor.value).toBe('programa exemplo')
  })

  it('calls onChange when text changes', async () => {
    const onChange = vi.fn()
    render(<SimplesEditor value="" onChange={onChange} />)
    const editor = screen.getByTestId('monaco-editor')
    await userEvent.type(editor, 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders in readOnly mode when readOnly is true', () => {
    render(<SimplesEditor value="codigo fixo" onChange={() => {}} readOnly />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveAttribute('readOnly')
  })

  it('renders with empty initial value', () => {
    render(<SimplesEditor value="" onChange={() => {}} />)
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement
    expect(editor.value).toBe('')
  })

  it('accepts markers prop without crashing', () => {
    const markers: CompileMarker[] = [
      { line: 3, column: 1, message: "erro: 'principal' não declarado" },
    ]
    render(<SimplesEditor value="programa teste" onChange={() => {}} markers={markers} />)
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
  })
})
