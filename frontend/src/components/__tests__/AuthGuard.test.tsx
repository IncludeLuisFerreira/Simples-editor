import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

let mockAuth = { user: null, loading: false }

vi.mock('../../lib/auth', () => ({
  useAuth: () => mockAuth,
}))

import { AuthGuard } from '../AuthGuard'

describe('AuthGuard', () => {
  it('shows restricted message when user is not authenticated', () => {
    mockAuth = { user: null, loading: false }
    render(<AuthGuard><div>conteudo</div></AuthGuard>)
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument()
  })

  it('shows loading spinner', () => {
    mockAuth = { user: null, loading: true }
    const { container } = render(<AuthGuard><div>conteudo</div></AuthGuard>)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth = { user: { id: '123' } as any, loading: false }
    render(<AuthGuard><div>conteudo secreto</div></AuthGuard>)
    expect(screen.getByText('conteudo secreto')).toBeInTheDocument()
  })
})
