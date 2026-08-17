import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
  tone?: 'default' | 'danger' | 'accent'
  label: string
}

const TONES: Record<NonNullable<IconButtonProps['tone']>, string> = {
  default: 'hover:text-fg hover:bg-fg/10',
  danger: 'hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/12',
  accent: 'hover:text-[var(--color-ember-300)] hover:bg-[var(--color-ember-500)]/15',
}

export function IconButton({
  children,
  active = false,
  tone = 'default',
  label,
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={[
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
        'text-fg/55 transition-colors duration-150 disabled:opacity-30',
        active
          ? 'bg-[var(--color-ember-500)]/20 text-[var(--color-ember-300)]'
          : TONES[tone],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
