import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold hover:text-blue-400 transition-colors">
            Simples Editor
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-400">{user.email}</span>
                <button
                  onClick={signOut}
                  className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
