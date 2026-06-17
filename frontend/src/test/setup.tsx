import '@testing-library/jest-dom'

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, ...props }: any) => {
    const { height, language, theme, options, ...rest } = props
    return (
      <textarea
        data-testid="monaco-editor"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={options?.readOnly ?? rest.readOnly}
        {...rest}
      />
    )
  },
  beforeMount: vi.fn(),
}))

vi.mock('@xterm/xterm', () => {
  function MockTerminal() {
    this.open = function() {}
    this.write = function() {}
    this.writeln = function() {}
    this.onData = function() { return { dispose: function() {} } }
    this.dispose = function() {}
    this.loadAddon = function() {}
    this.element = document.createElement('div')
  }
  return { Terminal: MockTerminal }
})

vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: any) => <div>{children}</div>,
  Group: ({ children }: any) => <div>{children}</div>,
  Separator: () => <div />,
}))

