import { useMemo, useState } from 'react'
import { useSystemInfo } from '../../api/queries'
import type { DockerApi } from '../../state/useDocker'
import type { Container } from '../../types'
import { ContainerMetricTable } from './ContainerMetricTable'
import { HostCharts } from './HostCharts'
import { METRICS, metricByKey, sumAligned } from './metrics'
import type { MetricKey } from './metrics'
import { useHostFlow } from './useHostFlow'

interface MonitoringPageProps {
  docker: DockerApi
  search: string
}

export function MonitoringPage({ docker, search }: MonitoringPageProps) {
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
              'flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors',
              item.key === metricKey
                ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
                : 'border-white/8 bg-white/[0.02] text-white/50 hover:text-white/85',
            ].join(' ')}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-white/30">
            {running.length} из {docker.containers.length} запущено
          </span>
          <Toggle
            checked={showStopped}
            onChange={setShowStopped}
            label="Показывать остановленные"
          />
        </div>
      </div>

      <ContainerMetricTable containers={visible} metric={metric} total={total} />

      <p className="pb-1 text-center text-[11px] text-white/20">
        История за текущую сессию вкладки — около 40 последних точек. Долговременное хранение
        появится позже.
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
        'flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors',
        checked
          ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
          : 'border-white/8 bg-white/[0.02] text-white/50 hover:text-white/85',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-[var(--color-ember-500)]/60' : 'bg-white/12',
        ].join(' ')}
      >
        <span
          className={[
            'h-2.5 w-2.5 rounded-full bg-white transition-transform',
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
