import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { useEffect } from 'react'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login' && location.pathname !== '/signup' && location.pathname !== '/forgot-password') {
      navigate({ to: '/login' })
    }
  }, [loading, user, location.pathname, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b26] text-[#c0caf5] flex items-center justify-center">
        <p className="text-[#a9b1d6]">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1b26] text-[#c0caf5] flex flex-col">
      <header className="border-b border-[#292e42]">
        <div className="w-full flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-bold">Simples Editor</h1>
          {user && (
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm bg-[#3b4261] hover:bg-[#565f89] rounded transition-colors"
            >
              Sair
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  )
}
