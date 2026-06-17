import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './context/AuthContext'
import { Dashboard } from './pages/Dashboard'
import { DadosDiarios } from './pages/DadosDiarios'
import { Configuracoes } from './pages/Configuracoes'
import { Login } from './pages/Login'

function App() {
  const { email } = useAuth()

  if (!email) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dados-diarios" element={<DadosDiarios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
