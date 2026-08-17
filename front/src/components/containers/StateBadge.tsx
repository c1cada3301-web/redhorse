import type { ContainerState } from '../../types'

const STYLES: Record<ContainerState, { label: string; dot: string; text: string; bg: string }> = {
  running: {
    label: 'running',
    dot: 'bg-[var(--color-mint-400)]',
    text: 'text-[var(--color-mint-400)]',
    bg: 'bg-[var(--color-mint-400)]/10',
  },
  exited: {
    label: 'exited',
    dot: 'bg-fg/40',
    text: 'text-fg/50',
    bg: 'bg-fg/6',
  },
  paused: {
    label: 'paused',
    dot: 'bg-[var(--color-sky-400)]',
    text: 'text-[var(--color-sky-400)]',
    bg: 'bg-[var(--color-sky-400)]/10',
  },
  restarting: {
    label: 'restarting',
    dot: 'bg-[var(--color-amber-ok)]',
    text: 'text-[var(--color-amber-ok)]',
    bg: 'bg-[var(--color-amber-ok)]/10',
  },
  created: {
    label: 'created',
    dot: 'bg-fg/40',
    text: 'text-fg/50',
    bg: 'bg-fg/6',
  },
  dead: {
    label: 'dead',
    dot: 'bg-[var(--color-danger)]',
    text: 'text-[var(--color-danger)]',
    bg: 'bg-[var(--color-danger)]/10',
  },
  removing: {
    label: 'removing',
    dot: 'bg-[var(--color-amber-ok)]',
    text: 'text-[var(--color-amber-ok)]',
    bg: 'bg-[var(--color-amber-ok)]/10',
  },
}

/** Если Docker пришлёт состояние, которого мы не знаем, бейдж не должен ронять страницу. */
const FALLBACK = { label: 'unknown', dot: 'bg-fg/30', text: 'text-fg/40', bg: 'bg-fg/5' }

export function StateBadge({ state }: { state: ContainerState }) {
  const style = STYLES[state] ?? { ...FALLBACK, label: String(state) }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] whitespace-nowrap ${style.bg} ${style.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot} ${state === 'running' ? 'rh-pulse' : ''}`}
      />
      {style.label}
    </span>
  )
}
