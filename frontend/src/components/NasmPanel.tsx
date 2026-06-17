import Editor from '@monaco-editor/react'

interface NasmPanelProps {
  state: 'idle' | 'compiling' | 'success' | 'infra-error'
  asm?: string
  errorLog?: string
}

export function NasmPanel({ state, asm, errorLog }: NasmPanelProps) {
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#24283b] text-[#a9b1d6] text-sm px-4 text-center gap-3 animate-[fadeIn_0.2s_ease-in]">
        <span className="text-4xl text-gray-600/25 font-mono select-none">&lt;/&gt;</span>
        Compile seu código para ver o assembly gerado
      </div>
    )
  }

  if (state === 'compiling') {
    return (
      <div className="flex items-center justify-center h-full bg-[#24283b] text-[#a9b1d6] text-sm gap-2 animate-[fadeIn_0.2s_ease-in]">
        <div className="animate-spin h-4 w-4 border-2 border-[#7aa2f7] border-t-transparent rounded-full" />
        Compilando...
      </div>
    )
  }

  if (state === 'infra-error') {
    return (
      <pre className="h-full overflow-auto p-4 text-[#f7768e] text-xs font-mono bg-[#24283b] whitespace-pre-wrap break-words animate-[fadeIn_0.2s_ease-in]">
        {errorLog ?? 'Erro desconhecido no toolchain'}
      </pre>
    )
  }

  return (
    <div className="h-full animate-[fadeIn_0.2s_ease-in]">
      <Editor
        height="100%"
        language="plaintext"
        theme="simples-dark"
        value={asm ?? ''}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          padding: { top: 12 },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'off',
        }}
      />
    </div>
  )
}
