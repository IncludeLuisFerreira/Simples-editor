import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/login')({
  component: Login,
})

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 3) % 100}%`,
  size: 2 + (i % 4),
  delay: `${(i * 0.7) % 6}s`,
  duration: `${8 + (i % 8)}s`,
  color: ['#7aa2f7', '#bb9af7', '#c0caf5', '#89ddff'][i % 4],
}))

function Login() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) navigate({ to: '/' })
  }, [user, navigate])

  return (
    <div className="relative min-h-screen bg-[#1a1b26] overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(122,162,247,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(187,154,247,0.04),transparent_50%)]" />

      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `floatUp ${p.duration} ${p.delay} infinite ease-out`,
            opacity: 0,
          }}
        />
      ))}

      <div className="relative z-10 w-full max-w-md mx-4 animate-[slideUpFade_0.6s_ease-out]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7aa2f7] to-transparent rounded-full" />
        <div className="bg-[#24283b]/70 backdrop-blur-xl border border-[#292e42] rounded-2xl shadow-2xl shadow-[#7aa2f7]/5 p-8 md:p-10">
          <h2 className="text-2xl font-semibold text-center mb-6 text-[#c0caf5]">
            Entrar no Simples Editor
          </h2>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={[]}
            redirectTo={window.location.origin}
          />
        </div>
      </div>
    </div>
  )
}
