import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Layers,
  Pause,
  Play,
  RotateCw,
  ScrollText,
  Skull,
  Square,
  Trash2,
} from 'lucide-react'
import type { ContainerDetails } from '../../api/types'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { StateBadge } from './StateBadge'
import { CopyButton } from './DetailPrimitives'
import { useT } from '@/state/settings'

/** Действия, доступные странице. `pause` — переключатель: бэкенд сам решает pause/unpause. */
export type DetailAction = 'start' | 'stop' | 'restart' | 'pause' | 'kill'

interface DetailHeaderProps {
  container: ContainerDetails
  onBack: () => void
  onOpenLogs: () => void
  onAction: (action: DetailAction) => void
  onRemove: () => void
}

export function BackButton({ onBack, label }: { onBack: () => void; label?: string }) {
  const t = useT()
  const caption = label ?? t('detail.back')

  return (
    <button
      type="button"
      onClick={onBack}
      title={caption}
      aria-label={caption}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-fg/5 text-foreground/75 transition-colors hover:border-border hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}

export function DetailHeader({ container, onBack, onOpenLogs, onAction, onRemove }: DetailHeaderProps) {
  const t = useT()
  const [confirmKill, setConfirmKill] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const { state } = container
  const running = state === 'running'
  const paused = state === 'paused'
  const restarting = state === 'restarting'
  const removing = state === 'removing'
  // Живым считаем всё, что ещё крутится в ядре: на него действуют stop и kill.
  const alive = running || paused || restarting

  return (
    <div className="rh-panel p-3">
      <div className="flex items-center gap-3">
        <BackButton onBack={onBack} />

        <div className="min-w-0 flex-1">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <button type="button" onClick={onBack} className="transition-colors hover:text-foreground">
              {t('nav.containers')}
            </button>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="truncate text-muted-foreground">{container.name}</span>
          </nav>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-medium text-foreground" title={container.name}>
              {container.name}
            </h1>
            <StateBadge state={state} />
            {container.stack !== null && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-ember-500)]/12 px-2 py-0.5 text-xs text-[var(--color-ember-300)]">
                <Layers className="h-3 w-3" />
                {container.stack}
              </span>
            )}
            {container.privileged && (
              <span className="rounded-md bg-[var(--color-danger)]/12 px-2 py-0.5 text-xs text-[var(--color-danger)]">
                привилегированный
              </span>
            )}
            <CopyButton value={container.id} label={t('detail.copyId')} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ActionButton
          icon={<Play className="h-3.5 w-3.5" />}
          label={t('containers.action.start')}
          tone="accent"
          disabled={alive || removing}
          onClick={() => onAction('start')}
        />
        <ActionButton
          icon={<Square className="h-3.5 w-3.5" />}
          label={t('containers.action.stop')}
          disabled={!alive}
          onClick={() => onAction('stop')}
        />
        <ActionButton
          icon={<RotateCw className="h-3.5 w-3.5" />}
          label={t('containers.action.restart')}
          disabled={removing}
          onClick={() => onAction('restart')}
        />
        <ActionButton
          icon={<Pause className="h-3.5 w-3.5" />}
          label={paused ? t('detail.unpause') : t('containers.action.pause')}
          disabled={!running && !paused}
          onClick={() => onAction('pause')}
        />
        <ActionButton
          icon={<Skull className="h-3.5 w-3.5" />}
          label={t('detail.kill')}
          tone="danger"
          disabled={!alive}
          onClick={() => setConfirmKill(true)}
        />
        <ActionButton
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label={t('containers.action.remove')}
          tone="danger"
          disabled={removing}
          onClick={() => setConfirmRemove(true)}
        />

        <span className="mx-1 h-5 w-px bg-fg/8" />

        <ActionButton
          icon={<ScrollText className="h-3.5 w-3.5" />}
          label={t('containers.action.logs')}
          tone="accent"
          onClick={onOpenLogs}
        />
      </div>

      <ConfirmDialog
        open={confirmKill}
        onOpenChange={setConfirmKill}
        title={t('detail.kill.title')}
        description={t('detail.kill.text')}
        subject={`${container.name} · ${container.image}`}
        confirmLabel={t('detail.kill')}
        onConfirm={() => onAction('kill')}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t('containers.remove.title')}
        description={
          alive
            ? t('containers.remove.textRunning')
            : t('containers.remove.text')
        }
        subject={`${container.name} · ${container.image}`}
        onConfirm={onRemove}
      />
    </div>
  )
}

interface ActionButtonProps {
  icon: ReactNode
  label: string
  tone?: 'default' | 'accent' | 'danger'
  disabled?: boolean
  onClick: () => void
}

const ACTION_TONES: Record<NonNullable<ActionButtonProps['tone']>, string> = {
  default: 'hover:border-border hover:text-foreground',
  accent: 'hover:border-[var(--color-ember-500)]/45 hover:text-foreground',
  danger: 'hover:border-[var(--color-danger)]/45 hover:text-[var(--color-danger)]',
}

function ActionButton({ icon, label, tone = 'default', disabled = false, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={[
        'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-fg/5 px-2.5 text-sm text-foreground/75',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-border disabled:hover:text-foreground/75',
        ACTION_TONES[tone],
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
