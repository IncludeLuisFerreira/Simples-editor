import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CodeEditor } from '../components/CodeEditor'
import { AuthGuard } from '../components/AuthGuard'

export const Route = createFileRoute('/')({
  component: () => (
    <AuthGuard>
      <Index />
    </AuthGuard>
  ),
})

const DEFAULT_CODE = `programa exemplo
  inteiro x
inicio
  escreva "Digite um numero: "
  leia x
  escreval "Voce digitou: ", x
fim`

function Index() {
  const [code, setCode] = useState(DEFAULT_CODE)

  return (
    <div data-testid="index-container" className="flex flex-col h-full space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-200">
          Editor SIMPLES
        </h2>
        <div className="space-x-2">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors">
            Run
          </button>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors">
            Stop
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px]">
        <CodeEditor
          code={code}
          onChange={(val) => setCode(val ?? '')}
        />
      </div>
    </div>
  )
}
