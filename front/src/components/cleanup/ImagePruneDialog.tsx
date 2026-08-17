import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, Check } from 'lucide-react'

interface ImagePruneDialogProps {
  open: boolean
  title: string
  description: string
  /** Точный перечень того, что уйдёт: количества и размеры. */
  subject: string
  allUnused: boolean
  onAllUnusedChange: (value: boolean) => void
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

/**
 * Отдельный диалог для образов: помимо подтверждения нужен переключатель
 * «все неиспользуемые», которого нет в общем ConfirmDialog.
 */
export function ImagePruneDialog({
  open,
  title,
  description,
  subject,
  allUnused,
  onAllUnusedChange,
  onConfirm,
  onOpenChange,
}: ImagePruneDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-[var(--color-ink-950)]/75 backdrop-blur-sm" />
        <Dialog.Content className="rh-panel rh-fade-in fixed top-1/2 left-1/2 z-100 w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-4">
          <div className="flex items-start gap-3">
            <span className="text-[var(--color-danger)]">
              <AlertTriangle className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[14px] font-medium text-fg">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[12px] leading-relaxed text-fg/50">
                {description}
              </Dialog.Description>

              <div className="mt-2 rounded-md border border-fg/8 bg-bg/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-fg/70">
                {subject}
              </div>

              <label className="mt-3 flex cursor-pointer items-start gap-2">
                <span
                  className={[
                    'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                    allUnused
                      ? 'border-[var(--color-ember-500)] bg-[var(--color-ember-500)]/25 text-[var(--color-ember-300)]'
                      : 'border-fg/20 bg-bg/30 text-transparent',
                  ].join(' ')}
                >
                  <Check className="h-3 w-3" />
                </span>

                <input
                  type="checkbox"
                  checked={allUnused}
                  onChange={(event) => onAllUnusedChange(event.target.checked)}
                  className="sr-only"
                />

                <span className="text-[12px] leading-snug text-fg/60">
                  Удалять все неиспользуемые образы, а не только без тега
                  <span className="mt-0.5 block text-[11px] text-[var(--color-amber-ok)]/80">
                    Уйдут и образы с тегами, если их не занял ни один контейнер — скачивать заново.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-8 rounded-lg border border-fg/10 bg-fg/5 px-3 text-[12px] text-fg/70 transition-colors hover:text-fg"
              >
                Отмена
              </button>
            </Dialog.Close>

            <button
              type="button"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
              className="h-8 rounded-lg border border-[var(--color-danger)]/45 bg-[var(--color-danger)]/15 px-3 text-[12px] text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/25"
            >
              Очистить
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
