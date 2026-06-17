import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { SIMPLES_KEYWORDS, SIMPLES_OPERATORS } from '../lib/simples-lang'

export interface CompileMarker {
  line: number
  column: number
  message: string
}

interface SimplesEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  markers?: CompileMarker[]
}

export function SimplesEditor({ value, onChange, readOnly = false, markers }: SimplesEditorProps) {
  const monacoRef = useRef<Monaco | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance
    monacoRef.current = monacoInstance
  }

  useEffect(() => {
    const monacoInstance = monacoRef.current
    const editorInstance = editorRef.current
    if (!monacoInstance || !editorInstance) return
    const model = editorInstance.getModel()
    if (!model) return
    const monacoMarkers = (markers ?? []).map((m) => ({
      severity: monacoInstance.MarkerSeverity.Error,
      startLineNumber: m.line,
      endLineNumber: m.line,
      startColumn: m.column,
      endColumn: m.column + 1,
      message: m.message,
    }))
    monacoInstance.editor.setModelMarkers(model, 'simplesc', monacoMarkers)
  }, [markers])

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
      onMount={handleMount}
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
        placeholder: 'Digite seu código Simples aqui...',
      }}
    />
  )
}
