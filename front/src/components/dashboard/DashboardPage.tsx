import { useMemo } from 'react'
import { Boxes, Cpu, HardDrive, Layers, MemoryStick, Play, Square } from 'lucide-react'
import { useDiskUsage, useSystemInfo } from '../../api/queries'
import type { DockerApi } from '../../state/useDocker'
import type { Container } from '../../types'
import { formatBytes, formatPercent, formatRate } from '../../lib/format'
import { Sparkline } from '../ui/Sparkline'
import { StateBadge } from '../containers/StateBadge'

interface DashboardPageProps {
  docker: DockerApi
  onOpenLogs: (container: Container) => void
}

interface Stack {
  name: string
  containers: Container[]
  cpu: number
  mem: number
}

export function DashboardPage({ docker, onOpenLogs }: DashboardPageProps) {
  const info = useSystemInfo()
  const disk = useDiskUsage()

  const running = docker.containers.filter((item) => item.state === 'running')
  const stopped = docker.containers.filter((item) => item.state !== 'running')

  const totals = useMemo(
    () =>
      running.reduce(
        (acc, item) => ({
          cpu: acc.cpu + item.stats.cpu,
          mem: acc.mem + item.stats.mem,
          net: acc.net + item.stats.netRx + item.stats.netTx,
        }),
        { cpu: 0, mem: 0, net: 0 },
      ),
    [running],
  )

  const stacks = useMemo(() => groupByStack(docker.containers), [docker.containers])

  // Кто сейчас греет хост сильнее всех — самое частое, зачем сюда заходят.
  const hottest = useMemo(
    () => [...running].sort((a, b) => b.stats.cpu - a.stats.cpu).slice(0, 5),
    [running],
  )

  const memLimit = info.data?.memory ?? 0
  const memPercent = memLimit > 0 ? (totals.mem / memLimit) * 100 : 0

  return (
    <div className="rh-scroll h-full space-y-3 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={<Play className="h-4 w-4" />}
          label="Запущено"
          value={String(running.length)}
          hint={`${stopped.length} остановлено`}
          tone="ok"
        />
        <Tile
          icon={<Cpu className="h-4 w-4" />}
          label="CPU суммарно"
          value={formatPercent(totals.cpu, 0)}
          hint={info.data !== undefined ? `${info.data.cpus} ядер` : '—'}
        />
        <Tile
          icon={<MemoryStick className="h-4 w-4" />}
          label="Память"
          value={formatBytes(totals.mem)}
          hint={memLimit > 0 ? `${memPercent.toFixed(0)}% от ${formatBytes(memLimit)}` : '—'}
        />
        <Tile
          icon={<HardDrive className="h-4 w-4" />}
          label="Сеть"
          value={formatRate(totals.net)}
          hint={`${docker.containers.length} контейнеров`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Стеки" icon={<Layers className="h-4 w-4" />}>
          {stacks.length === 0 ? (
            <Empty text="Стеков не найдено" />
          ) : (
            <div className="space-y-1.5">
              {stacks.map((stack) => (
                <div
                  key={stack.name}
                  className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.015] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-white/85">{stack.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {stack.containers.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onOpenLogs(item)}
                          title="Открыть логи"
                          className="rounded bg-black/30 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-white/45 transition-colors hover:text-[var(--color-ember-300)]"
                        >
                          {item.name}
                        </button>
                      ))}
                      {stack.containers.length > 6 && (
                        <span className="px-1 text-[10px] text-white/25">
                          +{stack.containers.length - 6}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-[family-name:var(--font-mono)] text-[11px]">
                    <div className="text-white/75">{formatPercent(stack.cpu, 1)}</div>
                    <div className="text-white/30">{formatBytes(stack.mem)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Место на диске" icon={<Boxes className="h-4 w-4" />}>
          {disk.data === undefined ? (
            <Empty text={disk.isPending ? 'Считаем…' : 'Нет данных'} />
          ) : (
            <div className="space-y-1.5">
              <DiskRow label="Образы" value={disk.data.images} />
              <DiskRow label="Контейнеры" value={disk.data.containers} />
              <DiskRow label="Тома" value={disk.data.volumes} />
              <DiskRow label="Кеш сборки" value={disk.data.buildCache} />
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Больше всего нагружают" icon={<Cpu className="h-4 w-4" />}>
        {hottest.length === 0 ? (
          <Empty text="Запущенных контейнеров нет" />
        ) : (
          <div className="space-y-1.5">
            {hottest.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.015] px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onOpenLogs(item)}
                  className="min-w-0 flex-1 truncate text-left text-[13px] text-white/85 hover:text-[var(--color-ember-300)]"
                >
                  {item.name}
                </button>
                <StateBadge state={item.state} />
                <Sparkline values={item.history.cpu} color="var(--color-ember-400)" width={72} height={22} />
                <div className="w-16 text-right font-[family-name:var(--font-mono)] text-[11px] text-white/75">
                  {formatPercent(item.stats.cpu, 1)}
                </div>
                <div className="w-20 text-right font-[family-name:var(--font-mono)] text-[11px] text-white/45">
                  {formatBytes(item.stats.mem)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

/** Группирует по метке compose-проекта; всё остальное — «без стека». */
function groupByStack(containers: Container[]): Stack[] {
  const map = new Map<string, Stack>()

  for (const container of containers) {
    const name = container.stack ?? 'без стека'
    const current = map.get(name) ?? { name, containers: [], cpu: 0, mem: 0 }

    map.set(name, {
      name,
      containers: [...current.containers, container],
      cpu: current.cpu + container.stats.cpu,
      mem: current.mem + container.stats.mem,
    })
  }

  return [...map.values()].sort((a, b) => b.containers.length - a.containers.length)
}

interface TileProps {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  tone?: 'ok' | 'default'
}

function Tile({ icon, label, value, hint, tone = 'default' }: TileProps) {
  return (
    <div className="rh-panel px-3 py-2.5">
      <div className="flex items-center gap-2 text-white/35">
        <span className={tone === 'ok' ? 'text-[var(--color-mint-400)]' : 'text-[var(--color-ember-400)]'}>
          {icon}
        </span>
        <span className="text-[11px]">{label}</span>
      </div>
      <div className="mt-1 font-[family-name:var(--font-mono)] text-[20px] text-white">{value}</div>
      <div className="text-[11px] text-white/30">{hint}</div>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rh-panel p-3">
      <header className="mb-2 flex items-center gap-2 text-white/45">
        <span className="text-[var(--color-ember-400)]">{icon}</span>
        <h2 className="text-[12px] tracking-wide">{title}</h2>
      </header>
      {children}
    </section>
  )
}

function DiskRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/6 bg-white/[0.015] px-3 py-2">
      <span className="text-[12px] text-white/60">{label}</span>
      <span className="font-[family-name:var(--font-mono)] text-[12px] text-white/80">
        {formatBytes(value)}
      </span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-20 items-center justify-center gap-2 text-[12px] text-white/30">
      <Square className="h-3.5 w-3.5" />
      {text}
    </div>
  )
}
