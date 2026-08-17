import type { DockerVolume } from '../../api/types'
import { formatBytes, shortId } from '../../lib/format'

export const VOLUME_GRID =
  'grid grid-cols-[minmax(220px,1.5fr)_84px_88px_132px_minmax(200px,1.7fr)] items-center gap-3'

const COMPOSE_PROJECT = 'com.docker.compose.project'
const COMPOSE_VOLUME = 'com.docker.compose.volume'
const ANONYMOUS = 'com.docker.volume.anonymous'

/**
 * Осиротевший — приблизительно: том без compose-проекта и с нулевым размером.
 * Точного «кто смонтировал» бэкенд не отдаёт, а размер Docker считает не всегда,
 * так что это подсказка, а не приговор — перед удалением проверяйте вручную.
 */
export function isOrphan(volume: DockerVolume): boolean {
  return volume.size === 0 && (volume.labels[COMPOSE_PROJECT] ?? '') === ''
}

export function isAnonymous(volume: DockerVolume): boolean {
  return ANONYMOUS in volume.labels
}

/** «16.08.2026 20:33» из ISO-строки Docker. */
export function formatCreatedAt(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return '—'

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

interface VolumeRowProps {
  volume: DockerVolume
}

export function VolumeRow({ volume }: VolumeRowProps) {
  const anonymous = isAnonymous(volume)
  const project = volume.labels[COMPOSE_PROJECT] ?? ''
  const composeVolume = volume.labels[COMPOSE_VOLUME] ?? ''

  return (
    <div
      className={`${VOLUME_GRID} rounded-xl border border-fg/6 bg-fg/[0.015] px-3 py-2.5 transition-colors hover:border-fg/12 hover:bg-fg/[0.035]`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            title={volume.name}
            className={[
              'truncate text-[13px] font-medium text-fg',
              anonymous ? 'font-[family-name:var(--font-mono)] text-fg/70' : '',
            ].join(' ')}
          >
            {anonymous ? shortId(volume.name) : volume.name}
          </span>

          {anonymous && (
            <span className="shrink-0 rounded bg-fg/6 px-1 text-[9px] text-fg/35">анонимный</span>
          )}

          {isOrphan(volume) && !anonymous && (
            <span className="shrink-0 rounded bg-[var(--color-amber-ok)]/12 px-1 text-[9px] text-[var(--color-amber-ok)]">
              возможно осиротевший
            </span>
          )}
        </div>

        {project !== '' && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="rounded bg-fg/5 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-fg/40">
              {project}
            </span>
            {composeVolume !== '' && (
              <span className="rounded bg-fg/5 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-fg/30">
                {composeVolume}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="truncate font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-sky-400)]/70">
        {volume.driver}
      </div>

      <div className="font-[family-name:var(--font-mono)] text-[11px] text-fg/55">
        {volume.size > 0 ? formatBytes(volume.size) : <span className="text-fg/25">—</span>}
      </div>

      <div className="font-[family-name:var(--font-mono)] text-[11px] text-fg/45">
        {formatCreatedAt(volume.createdAt)}
      </div>

      <div
        title={volume.mountpoint}
        className="truncate font-[family-name:var(--font-mono)] text-[11px] text-fg/40"
      >
        {volume.mountpoint}
      </div>
    </div>
  )
}
