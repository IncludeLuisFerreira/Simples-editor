import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'
import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/signup')({
  component: Signup,
})

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 3) % 100}%`,
  size: 2 + (i % 4),
  delay: `${(i * 0.7) % 6}s`,
  duration: `${8 + (i % 8)}s`,
  color: ['#7aa2f7', '#bb9af7', '#c0caf5', '#89ddff'][i % 4],
}))

const codeFragments = [
  { id: 'f1', text: 'se', left: '8%', delay: '1s', duration: '18s', size: 'text-2xl' },
  { id: 'f2', text: 'enquanto', left: '85%', delay: '4s', duration: '20s', size: 'text-xl' },
  { id: 'f3', text: '<-', left: '22%', delay: '7s', duration: '22s', size: 'text-3xl' },
  { id: 'f4', text: 'escreva', left: '72%', delay: '2s', duration: '19s', size: 'text-lg' },
  { id: 'f5', text: ':=', left: '45%', delay: '9s', duration: '24s', size: 'text-2xl' },
  { id: 'f6', text: 'fim', left: '60%', delay: '5s', duration: '16s', size: 'text-xl' },
  { id: 'f7', text: 'repita', left: '35%', delay: '3s', duration: '21s', size: 'text-lg' },
  { id: 'f8', text: '->', left: '90%', delay: '6s', duration: '17s', size: 'text-3xl' },
  { id: 'f9', text: 'leia', left: '15%', delay: '8s', duration: '23s', size: 'text-xl' },
  { id: 'f10', text: '()', left: '55%', delay: '0s', duration: '15s', size: 'text-2xl' },
  { id: 'f11', text: 'verdadeiro', left: '78%', delay: '10s', duration: '25s', size: 'text-sm' },
  { id: 'f12', text: ';', left: '5%', delay: '5.5s', duration: '20s', size: 'text-4xl' },
]

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const masked = local[0] + '*'.repeat(7)
  return `${masked}@${domain}`
}

function Signup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mouse, setMouse] = useState({ x: -1000, y: -1000 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  function getPull(
    px: number,
    py: number,
    mx: number,
    my: number,
    maxPull: number,
  ): [number, number] {
    const dx = mx - px
    const dy = my - py
    const dist = Math.sqrt(dx * dx + dy * dy)
    const radius = 220
    if (dist >= radius) return [0, 0]
    const strength = (1 - dist / radius) * maxPull
    return [(dx / dist) * strength, (dy / dist) * strength]
  }

  useEffect(() => {
    if (user) navigate({ to: '/' })
  }, [user, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/login',
      },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    if (!data.user || data.user.identities?.length === 0) {
      setError('Este email já está cadastrado. Faça login ou recupere sua senha.')
      setLoading(false)
      return
    }
    if (data.session) {
      await supabase.auth.signOut()
    }
    setSuccess(true)
    setLoading(false)
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#1a1b26] overflow-hidden flex items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(122,162,247,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(187,154,247,0.04),transparent_50%)]" />

      {particles.slice(0, 12).map((p) => {
        const pctLeft = parseFloat(p.left) / 100
        const w = containerSize.w
        const h = containerSize.h
        const px = pctLeft * w
        const py = h * 0.5
        const [ox, oy] = getPull(px, py, mouse.x, mouse.y, 18)
        return (
          <div
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: p.left,
              bottom: '-10px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              transform: `translate(${ox}px, ${oy}px)`,
              transition: 'transform 0.5s ease-out',
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                backgroundColor: p.color,
                animation: `floatUp ${p.duration} ${p.delay} infinite ease-out`,
                opacity: 0,
              }}
            />
          </div>
        )
      })}
      {particles.slice(12).map((p) => {
        const pctLeft = parseFloat(p.left) / 100
        const w = containerSize.w
        const h = containerSize.h
        const px = pctLeft * w
        const py = h * 0.5
        const [ox, oy] = getPull(px, py, mouse.x, mouse.y, 18)
        return (
          <div
            key={p.id}
            className="absolute pointer-events-none hidden sm:block"
            style={{
              left: p.left,
              bottom: '-10px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              transform: `translate(${ox}px, ${oy}px)`,
              transition: 'transform 0.5s ease-out',
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                backgroundColor: p.color,
                animation: `floatUp ${p.duration} ${p.delay} infinite ease-out`,
                opacity: 0,
              }}
            />
          </div>
        )
      })}

      {codeFragments.slice(0, 8).map((f) => {
        const pctLeft = parseFloat(f.left) / 100
        const w = containerSize.w
        const h = containerSize.h
        const px = pctLeft * w
        const py = h * 0.4
        const [ox, oy] = getPull(px, py, mouse.x, mouse.y, 25)
        return (
          <div
            key={f.id}
            className="absolute pointer-events-none"
            style={{
              left: f.left,
              bottom: '-40px',
              transform: `translate(${ox}px, ${oy}px)`,
              transition: 'transform 0.5s ease-out',
            }}
          >
            <span
              className={`block font-mono text-[#c0caf5]/30 select-none ${f.size}`}
              style={{
                animation: `driftUp ${f.duration} ${f.delay} infinite ease-out`,
                opacity: 0,
              }}
            >
              {f.text}
            </span>
          </div>
        )
      })}
      {codeFragments.slice(8).map((f) => {
        const pctLeft = parseFloat(f.left) / 100
        const w = containerSize.w
        const h = containerSize.h
        const px = pctLeft * w
        const py = h * 0.4
        const [ox, oy] = getPull(px, py, mouse.x, mouse.y, 25)
        return (
          <div
            key={f.id}
            className="absolute pointer-events-none hidden sm:block"
            style={{
              left: f.left,
              bottom: '-40px',
              transform: `translate(${ox}px, ${oy}px)`,
              transition: 'transform 0.5s ease-out',
            }}
          >
            <span
              className={`block font-mono text-[#c0caf5]/30 select-none ${f.size}`}
              style={{
                animation: `driftUp ${f.duration} ${f.delay} infinite ease-out`,
                opacity: 0,
              }}
            >
              {f.text}
            </span>
          </div>
        )
      })}

      <div className="relative z-10 w-full max-w-md mx-4 -mt-24 animate-[slideUpFade_0.6s_ease-out]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#bb9af7] to-transparent rounded-full" />
        <div className="bg-[#24283b]/70 backdrop-blur-xl border border-[#292e42] rounded-2xl shadow-2xl shadow-[#bb9af7]/5 p-8 md:p-10">
          <div className="flex flex-col items-center mb-6">
            <span
              className="text-5xl font-mono font-bold text-[#bb9af7] select-none mb-4"
              style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}
            >
              &lt;/&gt;
            </span>
            <h1
              className="text-3xl font-bold text-[#c0caf5]"
              style={{ animation: 'fadeIn 0.6s 0.1s ease-out both' }}
            >
              <span className="text-[#7aa2f7]">S</span>imples Editor
            </h1>
            <p
              className="text-[#a9b1d6] text-sm mt-2"
              style={{ animation: 'fadeIn 0.6s 0.2s ease-out both' }}
            >
              Criar nova conta
            </p>
          </div>
          <hr className="border-[#292e42] mb-6" />
          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-[#9ece6a] text-sm bg-[#9ece6a]/10 border border-[#9ece6a]/20 rounded-lg px-3 py-2">
                <span className="mt-0.5 shrink-0">✓</span>
                <span>
                  Um link de confirmação foi enviado ao email{' '}
                  <span className="text-[#c0caf5] font-medium">{maskEmail(email)}</span>
                </span>
              </div>
              <p className="text-[#a9b1d6] text-xs">
                Verifique sua caixa de entrada e clique no link para ativar sua conta.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#a9b1d6] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-[#1a1b26] border border-[#3b4261] rounded-lg text-[#c0caf5] text-base sm:text-sm px-4 py-3 placeholder-[#565f89] focus:outline-none focus:ring-2 focus:ring-[#bb9af7]/30 focus:border-[#bb9af7] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#a9b1d6] mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#1a1b26] border border-[#3b4261] rounded-lg text-[#c0caf5] text-base sm:text-sm px-4 py-3 pr-10 placeholder-[#565f89] focus:outline-none focus:ring-2 focus:ring-[#bb9af7]/30 focus:border-[#bb9af7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565f89] hover:text-[#a9b1d6] transition-colors"
                    tabIndex={-1}
                  >
                    {!showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#a9b1d6] mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#1a1b26] border border-[#3b4261] rounded-lg text-[#c0caf5] text-base sm:text-sm px-4 py-3 pr-10 placeholder-[#565f89] focus:outline-none focus:ring-2 focus:ring-[#bb9af7]/30 focus:border-[#bb9af7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565f89] hover:text-[#a9b1d6] transition-colors"
                    tabIndex={-1}
                  >
                    {!showConfirmPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-[#f7768e] text-sm bg-[#f7768e]/10 border border-[#f7768e]/20 rounded-lg px-3 py-2">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#bb9af7] hover:bg-[#c4a8ff] text-[#1a1b26] font-semibold py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-[#bb9af7]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-[#1a1b26] border-t-transparent rounded-full" />
                    Criando conta...
                  </span>
                ) : (
                  'Cadastrar'
                )}
              </button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => navigate({ to: '/login' })}
                  className="text-[#a9b1d6] hover:text-[#c0caf5] transition-colors"
                >
                  Já tem conta?{' '}
                  <span className="text-[#7aa2f7]">Entrar</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
