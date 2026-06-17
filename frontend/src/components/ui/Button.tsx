import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  primary:
    'bg-accent-gradient text-[#1a1303] font-semibold shadow-[0_8px_24px_-8px_rgba(230,178,58,0.7)] hover:brightness-110',
  ghost: 'text-muted hover:text-foreground hover:bg-surface-2',
  outline: 'border border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.06]',
  danger: 'text-negative hover:bg-negative/10',
}

export function Button({ variant = 'outline', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}
