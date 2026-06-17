import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@aj-alpha.com')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!login(email, senha)) setErro(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-gradient text-2xl font-black text-white shadow-glow">
            A
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">A&amp;J ALPHA COMPANY</h1>
            <p className="text-sm text-muted">Dashboard Financeiro</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-white/[0.07] bg-surface/60 p-6 shadow-card backdrop-blur-xl"
        >
          <div>
            <label className="mb-1 block text-sm text-muted">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value)
                setErro(false)
              }}
              placeholder="admin"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
            />
          </div>

          {erro && (
            <p className="text-sm text-negative">E-mail ou senha incorretos.</p>
          )}

          <Button variant="primary" type="submit" className="w-full py-2.5">
            <LogIn className="h-4 w-4" /> Entrar
          </Button>

          <p className="text-center text-xs text-muted">
            Demo: <span className="text-foreground">admin@aj-alpha.com</span> / senha{' '}
            <span className="text-foreground">admin</span>
          </p>
        </form>
      </div>
    </div>
  )
}
