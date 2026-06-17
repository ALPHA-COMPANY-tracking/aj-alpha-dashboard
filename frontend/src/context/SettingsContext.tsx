import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Settings } from '../types'

const DEFAULT_SETTINGS: Settings = {
  aliquotaImposto: 12.15,
  impostoAtivo: true,
  adAccountId: '',
  graphApiVersion: 'v21.0',
}

const STORAGE_KEY = 'luminar.settings'

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const update = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }))

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings deve ser usado dentro de SettingsProvider')
  return ctx
}
