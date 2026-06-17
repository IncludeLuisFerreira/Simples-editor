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
    if (!loading && !user && location.pathname !== '/login') {
      navigate({ to: '/login' })
    }
  }, [loading, user, location.pathname, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="border-b border-gray-700">
        <div className="w-full flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-bold">Simples Editor</h1>
          {user && (
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
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
