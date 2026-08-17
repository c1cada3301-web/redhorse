import { Activity, AlertTriangle, HeartPulse } from 'lucide-react'
import type { ContainerDetails } from '../../api/types'
import { formatUptime } from '../../lib/format'
import { DetailPanel, DetailTile, EMPTY_MARK, formatDateTime } from './DetailPrimitives'
import type { Tone } from './DetailPrimitives'

const HEALTH_LABEL: Record<ContainerDetails['health'], string> = {
  healthy: 'здоров',
  unhealthy: 'нездоров',
  starting: 'прогревается',
  none: 'проверок нет',
}

const HEALTH_TONE: Record<ContainerDetails['health'], Tone> = {
  healthy: 'ok',
  unhealthy: 'danger',
  starting: 'warn',
  none: 'muted',
}

/** Контейнер завершился, если у него есть время завершения и он больше не крутится. */
function isFinished(container: ContainerDetails): boolean {
  return container.finishedAt !== null && container.state !== 'running' && container.state !== 'paused'
}

export function DetailStatus({ container }: { container: ContainerDetails }) {
  const running = container.state === 'running'
  const finished = isFinished(container)

  return (
    <DetailPanel title="Состояние" icon={<Activity className="h-4 w-4" />} hint={container.status}>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <DetailTile
          label="Статус"
          value={container.state}
          hint={running ? `аптайм ${formatUptime(container.startedAt)}` : formatDateTime(container.finishedAt)}
          tone={running ? 'ok' : 'default'}
        />
        <DetailTile
          label="PID"
          value={container.pid > 0 ? String(container.pid) : EMPTY_MARK}
          hint={container.pid > 0 ? 'главный процесс' : 'процесса нет'}
        />
        <DetailTile
          label="Код выхода"
          value={finished ? String(container.exitCode) : EMPTY_MARK}
          hint={finished ? (container.exitCode === 0 ? 'штатное завершение' : 'аварийное завершение') : 'ещё работает'}
          tone={finished && container.exitCode !== 0 ? 'danger' : 'default'}
        />
        <DetailTile
          label="Рестарты"
          value={String(container.restarts)}
          hint={`политика: ${container.restartPolicy === '' ? 'нет' : container.restartPolicy}`}
          tone={container.restarts > 3 ? 'warn' : 'default'}
        />
        <DetailTile
          label="Health"
          value={HEALTH_LABEL[container.health] ?? String(container.health)}
          hint={container.healthLog.length > 0 ? `${container.healthLog.length} проверок` : 'без healthcheck'}
          tone={HEALTH_TONE[container.health] ?? 'default'}
        />
      </div>

      {container.oomKilled && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--color-danger)]/45 bg-[var(--color-danger)]/12 px-3 py-2 text-[12px] text-[var(--color-danger)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Контейнер убит по памяти — ядро выключило его при нехватке RAM (OOM). Поднимите лимит памяти или
          уменьшите потребление.
        </div>
      )}

      {container.error.trim() !== '' && (
        <div className="mt-2 rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 px-3 py-2">
          <div className="text-[11px] text-[var(--color-danger)]">Ошибка Docker</div>
          <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px] break-words whitespace-pre-wrap text-white/70">
            {container.error}
          </div>
        </div>
      )}

      {container.healthLog.length > 0 && (
        <div className="mt-2 rounded-lg border border-white/6 bg-black/25 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-white/40">
            <HeartPulse className="h-3.5 w-3.5 text-[var(--color-mint-400)]" />
            Последние проверки здоровья
          </div>
          <div className="rh-scroll max-h-40 space-y-1 overflow-y-auto">
            {container.healthLog.map((line, index) => (
              <div
                key={`${index}-${line.slice(0, 24)}`}
                className="font-[family-name:var(--font-mono)] text-[11px] break-words whitespace-pre-wrap text-white/55"
              >
                {line === '' ? EMPTY_MARK : line}
              </div>
            ))}
          </div>
        </div>
      )}
    </DetailPanel>
  )
}
