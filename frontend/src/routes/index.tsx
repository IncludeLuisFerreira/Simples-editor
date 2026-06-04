import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h2 className="text-2xl font-semibold text-gray-300">
        Bem-vindo ao editor online da linguagem SIMPLES
      </h2>
      <p className="text-gray-400 max-w-2xl text-center">
        Compile e execute código SIMPLES diretamente no navegador com suporte completo
        a entrada/saída interativa e visualização do assembly gerado.
      </p>
    </div>
  )
}
