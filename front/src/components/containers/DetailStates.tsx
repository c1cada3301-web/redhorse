import { AlertTriangle, PackageX, RefreshCw } from 'lucide-react'
import { BackButton } from './DetailHeader'
import { useT } from '@/state/settings'

/** Загрузка, ошибка и «контейнера больше нет» — три экрана вместо страницы. */

function Shell({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  const t = useT()

  return (
    <div className="rh-scroll h-full space-y-3 overflow-y-auto p-4">
      <div className="rh-panel flex items-center gap-3 p-3">
        <BackButton onBack={onBack} />
        <span className="text-xs text-muted-foreground">{t('nav.containers')}</span>
      </div>
      {children}
    </div>
  )
}

export function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <Shell onBack={onBack}>
      <div className="rh-panel space-y-2 p-3">
        <Bar className="h-4 w-56" />
        <Bar className="h-3 w-80" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="rh-panel space-y-2 p-3">
            <Bar className="h-2.5 w-16" />
            <Bar className="h-4 w-20" />
          </div>
        ))}
      </div>

      {[0, 1, 2].map((index) => (
        <div key={index} className="rh-panel space-y-2 p-3">
          <Bar className="h-3 w-32" />
          <Bar className="h-8 w-full" />
          <Bar className="h-8 w-full" />
          <Bar className="h-8 w-3/4" />
        </div>
      ))}
    </Shell>
  )
}

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-fg/6 ${className}`} />
}

interface DetailFailureProps {
  message: string
  onRetry: () => void
  onBack: () => void
}

export function DetailFailure({ message, onRetry, onBack }: DetailFailureProps) {
  const t = useT()
  return (
    <Shell onBack={onBack}>
      <div className="rh-panel flex flex-col items-center gap-3 px-4 py-10 text-center">
        <AlertTriangle className="h-7 w-7 text-[var(--color-danger)]" />
        <div className="text-base text-foreground/90">{t('detail.loadFailed')}</div>
        <div className="max-w-lg font-[family-name:var(--font-mono)] text-xs break-words text-muted-foreground">
          {message}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 px-3 text-sm text-[var(--color-ember-300)] transition-colors hover:bg-[var(--color-ember-500)]/25"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Повторить
        </button>
      </div>
    </Shell>
  )
}

export function DetailMissing({ onBack }: { onBack: () => void }) {
  const t = useT()
  return (
    <Shell onBack={onBack}>
      <div className="rh-panel flex flex-col items-center gap-3 px-4 py-10 text-center">
        <PackageX className="h-7 w-7 text-muted-foreground" />
        <div className="text-base text-foreground/90">{t('detail.removed')}</div>
        <div className="text-sm text-muted-foreground">{t('detail.removedHint')}</div>
        <button
          type="button"
          onClick={onBack}
          className="h-8 rounded-lg border border-border bg-fg/5 px-3 text-sm text-foreground/75 transition-colors hover:text-foreground"
        >
          К списку
        </button>
      </div>
    </Shell>
  )
}
