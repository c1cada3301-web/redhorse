import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'
import { useT } from '@/state/settings'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  /** Что именно затрагивается — имя контейнера, образа, тома. */
  subject?: string
  /** По умолчанию — «Удалить» на языке интерфейса. */
  confirmLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  subject,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const t = useT()
  const accent =
    tone === 'danger'
      ? 'border-[var(--color-danger)]/45 bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25'
      : 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)] hover:bg-[var(--color-ember-500)]/25'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-[var(--color-ink-950)]/75 backdrop-blur-sm" />
        <Dialog.Content className="rh-panel rh-fade-in fixed top-1/2 left-1/2 z-100 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-4">
          <div className="flex items-start gap-3">
            <span
              className={
                tone === 'danger' ? 'text-[var(--color-danger)]' : 'text-[var(--color-amber-ok)]'
              }
            >
              <AlertTriangle className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-medium text-fg">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-relaxed text-fg/50">
                {description}
              </Dialog.Description>

              {subject !== undefined && (
                <div className="mt-2 truncate rounded-md border border-fg/8 bg-bg/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-xs text-fg/70">
                  {subject}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-8 rounded-lg border border-fg/10 bg-fg/5 px-3 text-sm text-fg/70 transition-colors hover:text-fg"
              >
                {t('common.cancel')}
              </button>
            </Dialog.Close>

            <button
              type="button"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
              className={`h-8 rounded-lg border px-3 text-sm transition-colors ${accent}`}
            >
              {confirmLabel ?? t('common.delete')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
