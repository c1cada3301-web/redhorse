import { useMemo, useState } from 'react'
import { useSystemInfo } from '../../api/queries'
import type { DockerApi } from '../../state/useDocker'
import type { Container } from '../../types'
import { ContainerMetricTable } from './ContainerMetricTable'
import { HostCharts } from './HostCharts'
import { METRICS, metricByKey, sumAligned } from './metrics'
import type { MetricKey } from './metrics'
import { useHostFlow } from './useHostFlow'
import { useT } from '@/state/settings'

interface MonitoringPageProps {
  docker: DockerApi
  search: string
}

export function MonitoringPage({ docker, search }: MonitoringPageProps) {
  const t = useT()
  const info = useSystemInfo()
  const [metricKey, setMetricKey] = useState<MetricKey>('cpu')
  const [showStopped, setShowStopped] = useState(false)

  const metric = metricByKey(metricKey)

  const running = useMemo(
    () => docker.containers.filter((container) => container.state === 'running'),
    [docker.containers],
  )

  const flow = useHostFlow(running)

  // Хостовые ряды — поточечная сумма историй запущенных контейнеров.
  const host = useMemo(
    () => ({
      cpu: sumAligned(running.map((container) => container.history.cpu)),
      mem: sumAligned(running.map((container) => container.history.mem)),
    }),
    [running],
  )

  const visible = useMemo(
    () =>
      [...docker.containers]
        .filter(
          (container) =>
            (showStopped || container.state === 'running') && matches(container, search),
        )
        .sort((a, b) => metric.value(b) - metric.value(a)),
    [docker.containers, showStopped, search, metric],
  )

  const total = useMemo(
    () => running.reduce((sum, container) => sum + metric.value(container), 0),
    [running, metric],
  )

  const cpus = info.data?.cpus ?? 0
  const memory = info.data?.memory ?? 0

  return (
    <div className="rh-scroll h-full space-y-3 overflow-y-auto p-4">
      <HostCharts
        cpu={host.cpu}
        mem={host.mem}
        flow={flow}
        cpuMax={cpus > 0 ? cpus * 100 : undefined}
        memMax={memory > 0 ? memory : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        {METRICS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMetricKey(item.key)}
            className={[
              'flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
              item.key === metricKey
                ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
                : 'border-border bg-fg/[0.02] text-muted-foreground hover:text-foreground/90',
            ].join(' ')}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
            {t(item.label)}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
            {t('mon.runningOf', { running: running.length, total: docker.containers.length })}
          </span>
          <Toggle
            checked={showStopped}
            onChange={setShowStopped}
            label={t('mon.showStopped')}
          />
        </div>
      </div>

      <ContainerMetricTable containers={visible} metric={metric} total={total} />

      <p className="pb-1 text-center text-xs text-muted-foreground">
        {t('mon.note')}
      </p>
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
        checked
          ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
          : 'border-border bg-fg/[0.02] text-muted-foreground hover:text-foreground/90',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-[var(--color-ember-500)]/60' : 'bg-fg/12',
        ].join(' ')}
      >
        <span
          className={[
            'h-2.5 w-2.5 rounded-full bg-fg transition-transform',
            checked ? 'translate-x-2.5' : '',
          ].join(' ')}
        />
      </span>
      {label}
    </button>
  )
}

/** Фильтр из шапки — по имени и образу. */
function matches(container: Container, needle: string): boolean {
  if (needle === '') return true

  return `${container.name} ${container.image}`.toLowerCase().includes(needle.toLowerCase())
}
