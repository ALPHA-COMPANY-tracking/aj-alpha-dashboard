import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dados-diarios', label: 'Dados Diários', icon: CalendarDays },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { email, logout } = useAuth()
  const inicial = (email ?? 'A').charAt(0).toUpperCase()

  return (
    <>
      {/* Overlay no mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.06] bg-[#0b1020]/80 backdrop-blur-2xl transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Marca */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-gradient text-white shadow-[0_8px_20px_-6px_rgba(139,92,246,0.8)]">
              <span className="text-base font-black">A</span>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold tracking-tight text-foreground">
                A&amp;J ALPHA
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Company
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-accent-gradient-soft text-foreground'
                    : 'text-muted hover:bg-white/[0.04] hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-gradient" />
                  )}
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] transition-colors',
                      isActive ? 'text-violet2' : 'text-muted group-hover:text-foreground',
                    )}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Card do usuário */}
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-gradient text-sm font-bold text-white">
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{email}</div>
              <div className="text-[11px] text-muted">Conta admin</div>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-negative/10 hover:text-negative"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
