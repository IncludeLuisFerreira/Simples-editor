import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

let mockAuth = { user: null, loading: false }

vi.mock('../../lib/auth', () => ({
  useAuth: () => mockAuth,
}))

import { AuthGuard } from '../AuthGuard'

describe('AuthGuard', () => {
  it('shows loading spinner when loading is true', () => {
    mockAuth = { user: null, loading: true }
    render(
      <AuthGuard>
        <div>conteudo</div>
      </AuthGuard>,
    )
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows restricted message when user is null', () => {
    mockAuth = { user: null, loading: false }
    render(
      <AuthGuard>
        <div>conteudo</div>
      </AuthGuard>,
    )
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument()
    expect(screen.getByText(/Faça login para acessar esta página/i)).toBeInTheDocument()
  })

  it('renders login link when unauthenticated', () => {
    mockAuth = { user: null, loading: false }
    render(
      <AuthGuard>
        <div>conteudo</div>
      </AuthGuard>,
    )
    const link = screen.getByRole('link', { name: /ir para login/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders children when user is authenticated', () => {
    mockAuth = {
      user: { id: 'abc-123', email: 'user@test.com' } as unknown as Record<string, unknown>,
      loading: false,
    } as never

    render(
      <AuthGuard>
        <div>painel do usuario</div>
      </AuthGuard>,
    )
    expect(screen.getByText('painel do usuario')).toBeInTheDocument()
  })

  it('does not render restricted content when unauthenticated', () => {
    mockAuth = { user: null, loading: false }
    render(
      <AuthGuard>
        <div>conteudo secreto</div>
      </AuthGuard>,
    )
    expect(screen.queryByText('conteudo secreto')).not.toBeInTheDocument()
  })
})
