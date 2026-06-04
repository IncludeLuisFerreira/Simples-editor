import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="container mx-auto p-4">
        <h1 className="text-4xl font-bold text-center py-8">
          Simples Editor
        </h1>
        <Outlet />
      </main>
    </div>
  ),
})
