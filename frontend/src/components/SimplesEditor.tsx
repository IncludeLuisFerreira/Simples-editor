import Editor, { BeforeMount } from '@monaco-editor/react'
import { SIMPLES_KEYWORDS, SIMPLES_OPERATORS } from '../lib/simples-lang'

interface SimplesEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export function SimplesEditor({ value, onChange, readOnly = false }: SimplesEditorProps) {
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.languages.register({ id: 'simples' })

    monaco.languages.setMonarchTokensProvider('simples', {
      ignoreCase: true,
      keywords: SIMPLES_KEYWORDS,
      operators: SIMPLES_OPERATORS,
      symbols: /[=<>+\-*]+/,
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
          [/\d+\.\d+/, 'number.float'],
          [/\d+/, 'number'],
          [/<-/, 'operator'],
          [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
          [/[(),;]/, 'delimiter'],
          [/\s+/, 'white'],
        ],
      },
    })

    monaco.editor.defineTheme('simples-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '00bcd4', fontStyle: 'bold' },
        { token: 'number', foreground: 'ff9800' },
        { token: 'number.float', foreground: 'ff9800' },
        { token: 'identifier', foreground: 'e0e0e0' },
        { token: 'operator', foreground: 'ce93d8' },
        { token: 'delimiter', foreground: '90a4ae' },
        { token: 'comment', foreground: '66bb6a' },
      ],
      colors: {
        'editor.background': '#1a1a2e',
        'editor.foreground': '#e0e0e0',
        'editor.lineHighlightBackground': '#16213e',
        'editorCursor.foreground': '#00bcd4',
        'editor.selectionBackground': '#0f3460',
      },
    })
  }

  return (
    <Editor
      height="100%"
      language="simples"
      theme="simples-dark"
      beforeMount={handleBeforeMount}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        padding: { top: 12 },
        automaticLayout: true,
        readOnly,
        autoIndent: 'full',
        autoClosingBrackets: 'always',
        matchBrackets: 'always',
        tabSize: 2,
      }}
    />
  )
}
