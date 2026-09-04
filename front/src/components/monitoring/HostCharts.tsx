import { ArrowDownUp, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { AreaChart } from '../ui/AreaChart'
import type { Series } from '../ui/AreaChart'
import { formatBytes, formatPercent, formatRate } from '../../lib/format'
import type { HostFlow } from './useHostFlow'
import { useT } from '@/state/settings'

interface HostChartsProps {
  cpu: number[]
  mem: number[]
  flow: HostFlow
  /** Ядра хоста × 100% — фиксируем потолок шкалы CPU, если хост известен. */
  cpuMax?: number
  /** Вся память хоста — фиксируем потолок шкалы памяти. */
  memMax?: number
}

const CHART_HEIGHT = 150

/** Нижние границы шкал: на простое график не должен раздувать шум до гор. */
const CPU_FLOOR = 25
const MEM_FLOOR = 512 * 1024 * 1024
const RATE_FLOOR = 1024 * 1024

export function HostCharts({ cpu, mem, flow, cpuMax, memMax }: HostChartsProps) {
  const t = useT()
  const net: Series[] = [
    { values: flow.netRx, color: 'var(--color-mint-400)', label: t('mon.series.netRx') },
    { values: flow.netTx, color: 'var(--color-ember-300)', label: t('mon.series.netTx') },
  ]

  const blk: Series[] = [
    { values: flow.blkRead, color: 'var(--color-amber-ok)', label: t('mon.series.blkRead') },
    { values: flow.blkWrite, color: 'var(--color-sky-400)', label: t('mon.series.blkWrite') },
  ]

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <ChartPanel
        title={t('mon.cpuTotal')}
        icon={<Cpu className="h-4 w-4" />}
        hint={cpuMax !== undefined ? t('mon.capHint', { value: formatPercent(cpuMax, 0) }) : t('mon.byData')}
        series={[{ values: cpu, color: 'var(--color-ember-400)', label: 'CPU' }]}
        format={(value) => formatPercent(value, 0)}
        max={floorFor([cpu], Math.min(CPU_FLOOR, cpuMax ?? CPU_FLOOR))}
      />

      <ChartPanel
        title={t('mon.memTotal')}
        icon={<MemoryStick className="h-4 w-4" />}
        hint={memMax !== undefined ? t('mon.ofHint', { value: formatBytes(memMax) }) : t('mon.byData')}
        series={[{ values: mem, color: 'var(--color-sky-400)', label: t('mon.series.used') }]}
        format={(value) => formatBytes(value, 0)}
        max={floorFor([mem], Math.min(MEM_FLOOR, memMax ?? MEM_FLOOR))}
      />

      <ChartPanel
        title={t('mon.network')}
        icon={<ArrowDownUp className="h-4 w-4" />}
        hint={t('mon.netHint')}
        series={net}
        format={(value) => formatRate(value)}
        max={floorFor([flow.netRx, flow.netTx], RATE_FLOOR)}
      />

      <ChartPanel
        title={t('mon.disk')}
        icon={<HardDrive className="h-4 w-4" />}
        hint={t('mon.diskHint')}
        series={blk}
        format={(value) => formatRate(value)}
        max={floorFor([flow.blkRead, flow.blkWrite], RATE_FLOOR)}
      />
    </div>
  )
}

/** Пока данные ниже порога — держим шкалу на пороге, дальше график считает максимум сам. */
function floorFor(rows: number[][], floor: number): number | undefined {
  const peak = rows.reduce(
    (top, row) => row.reduce((inner, value) => (value > inner ? value : inner), top),
    0,
  )

  return peak < floor ? floor : undefined
}

interface ChartPanelProps {
  title: string
  icon: React.ReactNode
  hint: string
  series: Series[]
  format: (value: number) => string
  max?: number
}

function ChartPanel({ title, icon, hint, series, format, max }: ChartPanelProps) {
  return (
    <section className="rh-panel p-3">
      <header className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-base font-medium text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>

        {/* Текущее значение — главное на карточке, потому и набрано крупно. */}
        <div className="ml-auto flex items-start gap-5">
          {series.map((item) => (
            <div key={item.label} className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-2xs tracking-wider text-muted-foreground uppercase">
                <span className="size-1.5 rounded-full" style={{ background: item.color }} />
                {item.label}
              </div>
              <div className="font-mono text-2xl leading-tight text-foreground tabular-nums">
                {format(last(item.values))}
              </div>
            </div>
          ))}
        </div>
      </header>

      <AreaChart series={series} height={CHART_HEIGHT} format={format} max={max} />
    </section>
  )
}

function last(values: number[]): number {
  return values[values.length - 1] ?? 0
}
