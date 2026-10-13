import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, Check } from 'lucide-react'
import { useT } from '@/state/settings'

/** Галочка расширенной очистки: подпись, предупреждение и состояние. */
export interface PruneDialogOption {
  key: string
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}

interface PruneDialogProps {
  open: boolean
  title: string
  description: string
  /** Точный перечень того, что уйдёт: количества и размеры. */
  subject: string
  /** Для образов и томов — переключатели «удалять больше, чем prune по умолчанию». */
  options: readonly PruneDialogOption[]
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

/** Подтверждение очистки: перечень удаляемого и, где есть, галочки расширенного режима. */
export function PruneDialog({ open, title, description, subject, options, onConfirm, onOpenChange }: PruneDialogProps) {
  const t = useT()
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
              <Dialog.Title className="text-lg font-medium text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </Dialog.Description>

              <div className="mt-2 rounded-md border border-border bg-bg/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-xs leading-relaxed text-foreground/75">
                {subject}
              </div>

              {options.map((option) => (
                <label key={option.key} className="mt-3 flex cursor-pointer items-start gap-2">
                  <span
                    className={[
                      'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                      option.checked
                        ? 'border-[var(--color-ember-500)] bg-[var(--color-ember-500)]/25 text-[var(--color-ember-300)]'
                        : 'border-border bg-bg/30 text-transparent',
                    ].join(' ')}
                  >
                    <Check className="h-3 w-3" />
                  </span>

                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(event) => option.onChange(event.target.checked)}
                    className="sr-only"
                  />

                  <span className="text-sm leading-snug text-foreground/75">
                    {option.label}
                    <span className="mt-0.5 block text-xs text-[var(--color-amber-ok)]/80">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-8 rounded-lg border border-border bg-fg/5 px-3 text-sm text-foreground/75 transition-colors hover:text-foreground"
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
              className="h-8 rounded-lg border border-[var(--color-danger)]/45 bg-[var(--color-danger)]/15 px-3 text-sm text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/25"
            >
              {t('cleanup.run')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
