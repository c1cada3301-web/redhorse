import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useT } from '@/state/settings'

interface DialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** Максимальная ширина окна, например `680px`. */
  width?: string
  children: ReactNode
  footer?: ReactNode
}

/** Общая рамка модалок: оверлей, шапка, прокручиваемое тело и футер. */
export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  width = '640px',
  children,
  footer,
}: DialogShellProps) {
  const t = useT()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[110] bg-[var(--color-ink-950)]/75 backdrop-blur-sm" />

        <Dialog.Content
          style={{ width: `min(94vw, ${width})` }}
          className="rh-panel rh-fade-in fixed top-1/2 left-1/2 z-[120] flex max-h-[88vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden"
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>

            <Dialog.Close
              aria-label={t('common.close')}
              className="-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-fg/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="rh-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer !== undefined && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
