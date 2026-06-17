import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SimplesEditor } from '../SimplesEditor'

describe('SimplesEditor', () => {
  it('renders editor with initial value', () => {
    render(<SimplesEditor value="programa teste" onChange={() => {}} />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
    expect(editor).toHaveValue('programa teste')
  })

  it('calls onChange when text changes', async () => {
    const onChange = vi.fn()
    render(<SimplesEditor value="" onChange={onChange} />)
    const editor = screen.getByTestId('monaco-editor')
    await userEvent.type(editor, 'x')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders in readOnly mode', () => {
    render(<SimplesEditor value="code" onChange={() => {}} readOnly />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toBeInTheDocument()
  })
})
