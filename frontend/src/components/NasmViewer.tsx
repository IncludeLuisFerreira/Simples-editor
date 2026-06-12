import Editor, { BeforeMount } from '@monaco-editor/react'
import { registerAsmLang } from '../lib/asm-lang'

interface NasmViewerProps {
  asm: string
}

export function NasmViewer({ asm }: NasmViewerProps) {
  const handleBeforeMount: BeforeMount = (monaco) => {
    registerAsmLang(monaco)
  }

  return (
    <Editor
      height="100%"
      language="asm-x86"
      theme="asm-x86-dark"
      beforeMount={handleBeforeMount}
      value={asm}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        padding: { top: 12 },
        automaticLayout: true,
        readOnly: true,
        lineNumbers: 'on',
        tabSize: 2,
      }}
    />
  )
}
