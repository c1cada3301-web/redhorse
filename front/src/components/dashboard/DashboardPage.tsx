import { useMemo } from 'react'
import { Boxes, Cpu, HardDrive, Layers, MemoryStick, Play, Square } from 'lucide-react'
import { useDiskUsage, useSystemInfo } from '../../api/queries'
import type { DockerApi } from '../../state/useDocker'
import type { Container } from '../../types'
import { formatBytes, formatPercent, formatRate } from '../../lib/format'
import { Sparkline } from '../ui/Sparkline'
import { StateBadge } from '../containers/StateBadge'
import { useT } from '@/state/settings'
import { t as tStatic } from '@/lib/i18n'

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
  const t = useT()
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
          label={t('dash.running')}
          value={String(running.length)}
          hint={t('dash.stoppedHint', { count: stopped.length })}
          tone="ok"
        />
        <Tile
          icon={<Cpu className="h-4 w-4" />}
          label={t('dash.cpuTotal')}
          value={formatPercent(totals.cpu, 0)}
          hint={info.data !== undefined ? t('dash.coresHint', { count: info.data.cpus }) : t('common.dash')}
        />
        <Tile
          icon={<MemoryStick className="h-4 w-4" />}
          label={t('dash.memory')}
          value={formatBytes(totals.mem)}
          hint={
            memLimit > 0
              ? t('dash.memHint', { percent: memPercent.toFixed(0), total: formatBytes(memLimit) })
              : t('common.dash')
          }
        />
        <Tile
          icon={<HardDrive className="h-4 w-4" />}
          label={t('dash.network')}
          value={formatRate(totals.net)}
          hint={t('dash.containersHint', { count: docker.containers.length })}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={t('dash.stacks')} icon={<Layers className="h-4 w-4" />}>
          {stacks.length === 0 ? (
            <Empty text={t('dash.noStacks')} />
          ) : (
            <div className="space-y-1.5">
              {stacks.map((stack) => (
                <div
                  key={stack.name}
                  className="flex items-center gap-3 rounded-md bg-foreground/3 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base text-foreground/90">{stack.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {stack.containers.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onOpenLogs(item)}
                          title={t('dash.openLogs')}
                          className="rounded bg-bg/30 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-2xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {item.name}
                        </button>
                      ))}
                      {stack.containers.length > 6 && (
                        <span className="px-1 text-2xs text-muted-foreground">
                          +{stack.containers.length - 6}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-[family-name:var(--font-mono)] text-xs">
                    <div className="text-foreground/75">{formatPercent(stack.cpu, 1)}</div>
                    <div className="text-muted-foreground">{formatBytes(stack.mem)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t('dash.disk')} icon={<Boxes className="h-4 w-4" />}>
          {disk.data === undefined ? (
            <Empty text={disk.isPending ? t('dash.counting') : t('common.noData')} />
          ) : (
            <div className="space-y-1.5">
              <DiskRow label={t('dash.disk.images')} value={disk.data.images} />
              <DiskRow label={t('dash.disk.containers')} value={disk.data.containers} />
              <DiskRow label={t('dash.disk.volumes')} value={disk.data.volumes} />
              <DiskRow label={t('dash.disk.buildCache')} value={disk.data.buildCache} />
            </div>
          )}
        </Panel>
      </div>

      <Panel title={t('dash.top')} icon={<Cpu className="h-4 w-4" />}>
        {hottest.length === 0 ? (
          <Empty text={t('dash.noRunning')} />
        ) : (
          <div className="space-y-1.5">
            {hottest.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md bg-foreground/3 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onOpenLogs(item)}
                  className="min-w-0 flex-1 truncate text-left text-base text-foreground/90 hover:text-foreground"
                >
                  {item.name}
                </button>
                <StateBadge state={item.state} />
                <Sparkline values={item.history.cpu} color="var(--color-ember-400)" width={72} height={22} />
                <div className="w-16 text-right font-[family-name:var(--font-mono)] text-xs text-foreground/75">
                  {formatPercent(item.stats.cpu, 1)}
                </div>
                <div className="w-20 text-right font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
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
    const name = container.stack ?? tStatic('dash.noStack')
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
    <div className="rh-panel px-4 py-3.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {/* Иконка нейтральная: цветом выделяем только состояние, а не каждую плитку. */}
        <span className={tone === 'ok' ? 'text-success' : 'text-muted-foreground'}>{icon}</span>
        <span className="text-2xs tracking-wider uppercase">{label}</span>
      </div>
      <div className="mt-2 font-mono text-3xl leading-none text-foreground tabular-nums">{value}</div>
      <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rh-panel p-3">
      <header className="mb-2 flex items-center gap-2 text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-base font-medium text-foreground">{title}</h2>
      </header>
      {children}
    </section>
  )
}

function DiskRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-foreground/3 px-3 py-2">
      <span className="text-sm text-foreground/75">{label}</span>
      <span className="font-[family-name:var(--font-mono)] text-sm text-foreground/90">
        {formatBytes(value)}
      </span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-20 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Square className="h-3.5 w-3.5" />
      {text}
    </div>
  )
}
