import { useEffect, useMemo, useState } from 'react'
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { useDocker } from './state/useDocker'
import { useSystemInfo } from './api/queries'
import { useToasts } from './state/useToasts'
import { useT } from './state/settings'
import { Toasts } from './components/ui/Toasts'
import { useLogSessions } from './state/useLogSessions'
import { Sidebar } from './components/shell/Sidebar'
import type { NavKey } from './components/shell/Sidebar'
import { TopBar } from './components/shell/TopBar'
import { ContainersPage } from './components/containers/ContainersPage'
import { ContainerDetailPage } from './components/containers/ContainerDetailPage'
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
import { logout, type Account } from './api/auth'


interface AppProps {
  account: Account
  onSignOut: () => void
}

function App({ account, onSignOut }: AppProps) {
  const toasts = useToasts()
  const docker = useDocker({ onError: toasts.pushError })
  const logs = useLogSessions()
  const queryClient = useQueryClient()
  const fetching = useIsFetching()
  const systemInfo = useSystemInfo()
  const t = useT()
  const [nav, setNav] = useState<NavKey>('containers')
  // Открытый контейнер живёт рядом с разделом: React Router появится позже,
  // до тех пор адрес в строке браузера не меняется.
  const [detailId, setDetailId] = useState<string | null>(null)
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
      {/* Тёплое свечение в углу — фирменный акцент Dala */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-[var(--color-ember-600)]/12 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-[var(--color-sky-400)]/6 blur-[120px]" />

      <Sidebar
        current={nav}
        onNavigate={(key) => {
            setDetailId(null)
            setNav(key)
          }}
        runningCount={runningCount}
        totalCount={docker.containers.length}
        username={account.username}
        onSignOut={() => {
          // Кэш чистим до выхода: иначе после следующего входа на экран
          // на мгновение вернутся данные прошлой сессии.
          void logout().finally(() => {
            queryClient.clear()
            onSignOut()
          })
        }}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          title={t(`page.${nav}.title`)}
          subtitle={t(`page.${nav}.subtitle`)}
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
            detailId !== null ? (
              <ContainerDetailPage
                containerId={detailId}
                onBack={() => setDetailId(null)}
                onOpenLogs={(containerId) => {
                  const target = docker.containers.find((item) => item.id === containerId)
                  if (target !== undefined) logs.open(target)
                }}
                onAction={(id, action) => {
                  if (action === 'start') docker.start(id)
                  else if (action === 'stop') docker.stop(id)
                  else if (action === 'restart') docker.restart(id)
                  else if (action === 'pause') docker.pause(id)
                  else docker.kill(id)
                }}
                onRemove={(id) => {
                  docker.remove(id)
                  setDetailId(null)
                }}
              />
            ) : (
              <ContainersPage
                docker={docker}
                logs={logs}
                search={search}
                onOpenDetails={setDetailId}
              />
            )
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
