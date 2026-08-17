import { ShieldAlert, SlidersHorizontal } from 'lucide-react'
import type { ContainerDetails } from '../../api/types'
import { formatBytes } from '../../lib/format'
import { DetailPanel, DetailTile, plural } from './DetailPrimitives'

/** Docker хранит квоту CPU в нанопроцессорах: 1 ядро — это 1e9. */
const NANO_PER_CORE = 1_000_000_000

const POLICY_LABEL: Record<string, string> = {
  no: 'не перезапускать',
  always: 'всегда',
  'unless-stopped': 'кроме ручной остановки',
  'on-failure': 'при сбое',
}

export function DetailLimits({ container }: { container: ContainerDetails }) {
  const { limits } = container
  const cores = limits.nanoCpus / NANO_PER_CORE
  const policy = container.restartPolicy === '' ? 'no' : container.restartPolicy
  const retries = container.restartPolicyRetries

  return (
    <DetailPanel
      title="Ограничения и политика"
      icon={<SlidersHorizontal className="h-4 w-4" />}
      right={
        container.privileged ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-danger)]/12 px-2 py-0.5 text-[11px] text-[var(--color-danger)]">
            <ShieldAlert className="h-3.5 w-3.5" />
            привилегированный
          </span>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <DetailTile
          label="Память"
          value={limits.memory > 0 ? formatBytes(limits.memory) : 'без лимита'}
          hint={limits.memory > 0 ? 'жёсткий предел' : 'вся память хоста'}
          tone={limits.memory > 0 ? 'default' : 'muted'}
        />
        <DetailTile
          label="CPU"
          value={cores > 0 ? `${cores.toFixed(2)} ${plural(Math.round(cores), ['ядро', 'ядра', 'ядер'])}` : 'без лимита'}
          hint={limits.nanoCpus > 0 ? `${limits.nanoCpus} nanoCPU` : 'все ядра хоста'}
          tone={cores > 0 ? 'default' : 'muted'}
        />
        <DetailTile
          label="Доля CPU"
          value={limits.cpuShares > 0 ? String(limits.cpuShares) : 'по умолчанию'}
          hint="вес при конкуренции"
          tone={limits.cpuShares > 0 ? 'default' : 'muted'}
        />
        <DetailTile
          label="Перезапуск"
          value={POLICY_LABEL[policy] ?? policy}
          hint={
            retries > 0
              ? `до ${retries} ${plural(retries, ['попытки', 'попыток', 'попыток'])}`
              : 'без ограничения попыток'
          }
        />
      </div>
    </DetailPanel>
  )
}
