import { useEffect, useMemo, useState } from 'react'
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { useDocker } from './state/useDocker'
import { useSystemInfo } from './api/queries'
import { useToasts } from './state/useToasts'
import { Toasts } from './components/ui/Toasts'
import { useLogSessions } from './state/useLogSessions'
import { Sidebar } from './components/shell/Sidebar'
import type { NavKey } from './components/shell/Sidebar'
import { TopBar } from './components/shell/TopBar'
import { ContainersPage } from './components/containers/ContainersPage'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { ImagesPage } from './components/images/ImagesPage'
import { CleanupPage } from './components/cleanup/CleanupPage'
import { MonitoringPage } from './components/monitoring/MonitoringPage'
import { NetworksPage } from './components/networks/NetworksPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { VolumesPage } from './components/volumes/VolumesPage'
import { LogDock } from './components/logview/LogDock'
import { FloatingLogWindow } from './components/logview/FloatingLogWindow'
import { LogPane } from './components/logview/LogPane'

const PAGE_META: Record<NavKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Обзор', subtitle: 'Сводка по хосту и стекам' },
  containers: { title: 'Контейнеры', subtitle: 'Локальный Docker Engine · unix:///var/run/docker.sock' },
  images: { title: 'Образы', subtitle: 'Сборка, теги, слои и размеры' },
  volumes: { title: 'Тома', subtitle: 'Хранилище и точки монтирования' },
  networks: { title: 'Сети', subtitle: 'Bridge, overlay и подключённые контейнеры' },
  monitoring: { title: 'Мониторинг', subtitle: 'CPU, память, диск и сеть по контейнерам' },
  cleanup: { title: 'Очистка', subtitle: 'Prune, политики хранения и таймеры' },
  settings: { title: 'Настройки', subtitle: 'Хосты, доступ, внешний вид' },
}

function App() {
  const toasts = useToasts()
  const docker = useDocker({ onError: toasts.pushError })
  const logs = useLogSessions()
  const queryClient = useQueryClient()
  const fetching = useIsFetching()
  const systemInfo = useSystemInfo()
  const [nav, setNav] = useState<NavKey>('containers')
  const [search, setSearch] = useState('')

  const totals = useMemo(() => {
    return docker.containers.reduce(
      (acc, container) => ({
        cpu: acc.cpu + container.stats.cpu,
        mem: acc.mem + container.stats.mem,
        net: acc.net + container.stats.netRx + container.stats.netTx,
      }),
      { cpu: 0, mem: 0, net: 0 },
    )
  }, [docker.containers])

  const maximized = logs.sessions.find((session) => session.id === logs.maximizedId) ?? null
  const floating = logs.sessions.filter((session) => session.floating)
  const runningCount = docker.containers.filter((container) => container.state === 'running').length

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && logs.maximizedId !== null) {
        logs.maximize(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [logs])

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--color-ink-950)]">
      {/* Тёплое свечение в углу — фирменный акцент Redhorse */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-[var(--color-ember-600)]/12 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-[var(--color-sky-400)]/6 blur-[120px]" />

      <Sidebar
        current={nav}
        onNavigate={setNav}
        runningCount={runningCount}
        totalCount={docker.containers.length}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          title={PAGE_META[nav].title}
          subtitle={PAGE_META[nav].subtitle}
          search={search}
          onSearch={setSearch}
          totalCpu={totals.cpu}
          totalMem={totals.mem}
          totalNet={totals.net}
          connected={docker.connected}
          hostName={systemInfo.data?.name ?? 'docker'}
          refreshing={fetching > 0}
          onRefresh={() => void queryClient.invalidateQueries()}
        />

        <main className="min-h-0 flex-1">
          {nav === 'containers' ? (
            <ContainersPage docker={docker} logs={logs} search={search} />
          ) : nav === 'dashboard' ? (
            <DashboardPage docker={docker} onOpenLogs={logs.open} />
          ) : nav === 'images' ? (
            <ImagesPage search={search} />
          ) : nav === 'monitoring' ? (
            <MonitoringPage docker={docker} search={search} />
          ) : nav === 'cleanup' ? (
            <CleanupPage />
          ) : nav === 'settings' ? (
            <SettingsPage />
          ) : nav === 'networks' ? (
            <NetworksPage search={search} />
          ) : (
            <VolumesPage search={search} />
          )}
        </main>

        <LogDock api={logs} />
      </div>

      {floating.map((session, index) => (
        <FloatingLogWindow
          key={session.id}
          session={session}
          zIndex={session.id === logs.activeId ? 60 : 40 + index}
          active={session.id === logs.activeId}
          onFocus={() => logs.focus(session.id)}
          onRectChange={(rect) => logs.moveWindow(session.id, rect)}
          onUpdateOptions={(patch) => logs.updateOptions(session.id, patch)}
          onRangeChange={(range) => logs.setRange(session.id, range)}
          onClear={() => logs.clear(session.id)}
          onClose={() => logs.close(session.id)}
          onAttach={() => logs.attach(session.id)}
          onMaximize={() => logs.maximize(session.id)}
        />
      ))}

      <Toasts items={toasts.items} onDismiss={toasts.dismiss} />

      {maximized !== null && (
        <div className="rh-fade-in fixed inset-0 z-100 bg-[var(--color-ink-950)]/92 p-3 backdrop-blur-sm">
          <div className="h-full [&>section]:h-full">
            <LogPane
              session={maximized}
              variant="fullscreen"
              active
              onUpdateOptions={(patch) => logs.updateOptions(maximized.id, patch)}
              onRangeChange={(range) => logs.setRange(maximized.id, range)}
              onClear={() => logs.clear(maximized.id)}
              onClose={() => logs.close(maximized.id)}
              onRestore={() => logs.maximize(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
