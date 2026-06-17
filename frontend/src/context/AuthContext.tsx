import { createContext, useContext, useState, type ReactNode } from 'react'

// Autenticação simples de demonstração (uma conta admin).
// Em produção: substituir por chamada ao backend (/auth/login) com hash de senha.
const DEMO_EMAIL = 'admin@aj-alpha.com'
const DEMO_PASSWORD = 'admin'
const STORAGE_KEY = 'luminar.auth'

interface AuthContextValue {
  email: string | null
  login: (email: string, senha: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )

  const login = (inputEmail: string, senha: string) => {
    if (inputEmail.trim().toLowerCase() === DEMO_EMAIL && senha === DEMO_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, inputEmail.trim().toLowerCase())
      setEmail(inputEmail.trim().toLowerCase())
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setEmail(null)
  }

  return (
    <AuthContext.Provider value={{ email, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
