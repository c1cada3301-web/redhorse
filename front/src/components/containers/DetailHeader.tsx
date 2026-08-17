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

/** Действия, доступные странице. `pause` — переключатель: бэкенд сам решает pause/unpause. */
export type DetailAction = 'start' | 'stop' | 'restart' | 'pause' | 'kill'

interface DetailHeaderProps {
  container: ContainerDetails
  onBack: () => void
  onOpenLogs: () => void
  onAction: (action: DetailAction) => void
  onRemove: () => void
}

export function BackButton({ onBack, label = 'К списку контейнеров' }: { onBack: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-[var(--color-ember-500)]/40 hover:text-[var(--color-ember-300)]"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}

export function DetailHeader({ container, onBack, onOpenLogs, onAction, onRemove }: DetailHeaderProps) {
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
          <nav className="flex items-center gap-1 text-[11px] text-white/35">
            <button type="button" onClick={onBack} className="transition-colors hover:text-[var(--color-ember-300)]">
              Контейнеры
            </button>
            <ChevronRight className="h-3 w-3 text-white/20" />
            <span className="truncate text-white/55">{container.name}</span>
          </nav>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[17px] font-medium text-white" title={container.name}>
              {container.name}
            </h1>
            <StateBadge state={state} />
            {container.stack !== null && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-ember-500)]/12 px-2 py-0.5 text-[11px] text-[var(--color-ember-300)]">
                <Layers className="h-3 w-3" />
                {container.stack}
              </span>
            )}
            {container.privileged && (
              <span className="rounded-md bg-[var(--color-danger)]/12 px-2 py-0.5 text-[11px] text-[var(--color-danger)]">
                привилегированный
              </span>
            )}
            <CopyButton value={container.id} label="Скопировать полный ID" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ActionButton
          icon={<Play className="h-3.5 w-3.5" />}
          label="Запустить"
          tone="accent"
          disabled={alive || removing}
          onClick={() => onAction('start')}
        />
        <ActionButton
          icon={<Square className="h-3.5 w-3.5" />}
          label="Остановить"
          disabled={!alive}
          onClick={() => onAction('stop')}
        />
        <ActionButton
          icon={<RotateCw className="h-3.5 w-3.5" />}
          label="Перезапустить"
          disabled={removing}
          onClick={() => onAction('restart')}
        />
        <ActionButton
          icon={<Pause className="h-3.5 w-3.5" />}
          label={paused ? 'Снять с паузы' : 'Пауза'}
          disabled={!running && !paused}
          onClick={() => onAction('pause')}
        />
        <ActionButton
          icon={<Skull className="h-3.5 w-3.5" />}
          label="Убить"
          tone="danger"
          disabled={!alive}
          onClick={() => setConfirmKill(true)}
        />
        <ActionButton
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Удалить"
          tone="danger"
          disabled={removing}
          onClick={() => setConfirmRemove(true)}
        />

        <span className="mx-1 h-5 w-px bg-white/8" />

        <ActionButton
          icon={<ScrollText className="h-3.5 w-3.5" />}
          label="Логи"
          tone="accent"
          onClick={onOpenLogs}
        />
      </div>

      <ConfirmDialog
        open={confirmKill}
        onOpenChange={setConfirmKill}
        title="Убить контейнер?"
        description="Процессу будет послан SIGKILL без шанса завершиться корректно. Несохранённые данные пропадут."
        subject={`${container.name} · ${container.image}`}
        confirmLabel="Убить"
        onConfirm={() => onAction('kill')}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Удалить контейнер?"
        description={
          alive
            ? 'Контейнер запущен — он будет остановлен принудительно. Данные в анонимных томах не удаляются.'
            : 'Контейнер будет удалён. Данные в анонимных томах не удаляются.'
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
  default: 'hover:border-white/20 hover:text-white',
  accent: 'hover:border-[var(--color-ember-500)]/45 hover:text-[var(--color-ember-300)]',
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
        'inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[12px] text-white/65',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:border-white/10 disabled:hover:text-white/65',
        ACTION_TONES[tone],
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
