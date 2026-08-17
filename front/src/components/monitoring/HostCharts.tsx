import { ArrowDownUp, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { AreaChart } from '../ui/AreaChart'
import type { Series } from '../ui/AreaChart'
import { formatBytes, formatPercent, formatRate } from '../../lib/format'
import type { HostFlow } from './useHostFlow'

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
  const net: Series[] = [
    { values: flow.netRx, color: 'var(--color-mint-400)', label: 'Приём' },
    { values: flow.netTx, color: 'var(--color-ember-300)', label: 'Передача' },
  ]

  const blk: Series[] = [
    { values: flow.blkRead, color: 'var(--color-amber-ok)', label: 'Чтение' },
    { values: flow.blkWrite, color: 'var(--color-sky-400)', label: 'Запись' },
  ]

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <ChartPanel
        title="CPU суммарно"
        icon={<Cpu className="h-4 w-4" />}
        hint={cpuMax !== undefined ? `потолок ${formatPercent(cpuMax, 0)}` : 'по данным'}
        series={[{ values: cpu, color: 'var(--color-ember-400)', label: 'CPU' }]}
        format={(value) => formatPercent(value, 0)}
        max={floorFor([cpu], Math.min(CPU_FLOOR, cpuMax ?? CPU_FLOOR))}
      />

      <ChartPanel
        title="Память суммарно"
        icon={<MemoryStick className="h-4 w-4" />}
        hint={memMax !== undefined ? `из ${formatBytes(memMax)}` : 'по данным'}
        series={[{ values: mem, color: 'var(--color-sky-400)', label: 'Занято' }]}
        format={(value) => formatBytes(value, 0)}
        max={floorFor([mem], Math.min(MEM_FLOOR, memMax ?? MEM_FLOOR))}
      />

      <ChartPanel
        title="Сеть"
        icon={<ArrowDownUp className="h-4 w-4" />}
        hint="приём и передача"
        series={net}
        format={(value) => formatRate(value)}
        max={floorFor([flow.netRx, flow.netTx], RATE_FLOOR)}
      />

      <ChartPanel
        title="Диск"
        icon={<HardDrive className="h-4 w-4" />}
        hint="чтение и запись"
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
      <header className="mb-1 flex items-center gap-2">
        <span className="text-[var(--color-ember-400)]">{icon}</span>
        <h2 className="text-[12px] tracking-wide text-fg/60">{title}</h2>
        <span className="text-[11px] text-fg/25">{hint}</span>

        <div className="ml-auto flex items-center gap-3">
          {series.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
              <span className="text-[11px] text-fg/35">{item.label}</span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-fg/85">
                {format(last(item.values))}
              </span>
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
