import { Badge } from '@/components/ui/badge'
import type { ContainerState } from '../../types'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'default'

/** Цвет несёт смысл состояния, а не оформляет строку. */
const TONES: Record<ContainerState, Tone> = {
  running: 'success',
  restarting: 'warning',
  removing: 'warning',
  paused: 'info',
  dead: 'danger',
  exited: 'default',
  created: 'default',
}

const DOTS: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  default: 'bg-muted-foreground',
}

export function StateBadge({ state }: { state: ContainerState }) {
  // Docker может прислать состояние, которого мы не знаем: показываем как есть,
  // нейтральным тоном, вместо падения страницы.
  const tone = TONES[state] ?? 'default'

  return (
    <Badge variant={tone} className="gap-1.5 px-2 py-0.5 text-xs">
      <span className={`size-1.5 rounded-full ${DOTS[tone]} ${state === 'running' ? 'rh-pulse' : ''}`} />
      {String(state)}
    </Badge>
  )
}
