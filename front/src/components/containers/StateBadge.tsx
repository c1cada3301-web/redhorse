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
    dot: 'bg-white/40',
    text: 'text-white/50',
    bg: 'bg-white/6',
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
    dot: 'bg-white/40',
    text: 'text-white/50',
    bg: 'bg-white/6',
  },
}

export function StateBadge({ state }: { state: ContainerState }) {
  const style = STYLES[state]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] ${style.bg} ${style.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot} ${state === 'running' ? 'rh-pulse' : ''}`}
      />
      {style.label}
    </span>
  )
}
