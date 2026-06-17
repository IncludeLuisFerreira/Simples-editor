import { type ReactNode } from 'react'
import { useAuth } from '../lib/auth'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-[#7aa2f7] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-2xl font-semibold text-[#c0caf5]">Acesso restrito</h2>
        <p className="text-[#a9b1d6]">Faça login para acessar esta página.</p>
        <a
          href="/login"
          className="px-4 py-2 bg-[#7aa2f7] hover:bg-[#89b4fa] text-[#1a1b26] rounded transition-colors"
        >
          Ir para login
        </a>
      </div>
    )
  }

  return <>{children}</>
}
