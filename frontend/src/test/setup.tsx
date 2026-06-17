import '@testing-library/jest-dom'

vi.mock('@monaco-editor/react', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ value, onChange, ...props }: Record<string, any>) => {
    const { options, ...rest } = props
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Panel: ({ children }: Record<string, any>) => <div>{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Group: ({ children }: Record<string, any>) => <div>{children}</div>,
  Separator: () => <div />,
}))

