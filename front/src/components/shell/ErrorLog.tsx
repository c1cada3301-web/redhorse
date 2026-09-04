import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, Copy, Trash2, X } from 'lucide-react'
import { clearErrors, subscribe, type ClientError } from '../../lib/clientErrors'
import { useT } from '../../state/settings'

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString('ru-RU', { hour12: false })
}

/**
 * Панель ошибок поверх интерфейса.
 *
 * Появляется сама, как только что-то упало, и не мешает работать: свёрнутая
 * это узкая полоска со счётчиком. Смысл в том, чтобы не открывать консоль —
 * панель управления Docker часто открыта на втором мониторе, и незамеченная
 * ошибка выглядит как «оно просто не обновляется».
 */
export function ErrorLog() {
  const t = useT()
  const [errors, setErrors] = useState<ClientError[]>([])
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(0)

  useEffect(() => subscribe(setErrors), [])

  // Новая ошибка после закрытия панели снова её показывает.
  const fresh = errors.filter((item) => item.id > dismissed)
  if (fresh.length === 0) return null

  const total = fresh.reduce((sum, item) => sum + item.count, 0)

  const copyAll = () => {
    const text = fresh
      .map((item) =>
        [
          `[${timeOf(item.at)}] ${t(`error.kind.${item.kind}`)}${item.count > 1 ? ` ×${item.count}` : ''}`,
          item.message,
          item.source ?? '',
          item.stack ?? '',
        ]
          .filter((part) => part !== '')
          .join('\n'),
      )
      .join('\n\n')
    void navigator.clipboard?.writeText(text)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3">
      <div className="rh-scroll pointer-events-auto w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--color-danger)]/35 bg-[var(--color-ink-850)] shadow-2xl shadow-black/60">
        <div className="flex items-center gap-2 border-b border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-danger)]" />
          <span className="text-sm text-foreground/90">
            {total === 1 ? t('error.log.one') : t('error.log.many', { count: total })}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={copyAll}
              title={t('error.log.copy')}
              aria-label={t('error.log.copyHint')}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-fg/10 hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={clearErrors}
              title={t('error.log.clear')}
              aria-label={t('error.log.clearHint')}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-fg/10 hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              title={open ? t('error.log.collapse') : t('error.log.expand')}
              aria-label={open ? t('error.log.collapse') : t('error.log.expand')}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-fg/10 hover:text-foreground"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : 'rotate-180'}`} />
            </button>
            <button
              type="button"
              onClick={() => setDismissed(Math.max(...fresh.map((item) => item.id)))}
              title={t('error.log.hideHint')}
              aria-label={t('error.log.hide')}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-fg/10 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className={`rh-scroll overflow-y-auto ${open ? 'max-h-72' : 'max-h-24'}`}>
          {fresh.map((item) => (
            <div key={item.id} className="border-b border-border px-3 py-2 last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-mono)] text-2xs text-muted-foreground">
                  {timeOf(item.at)}
                </span>
                <span className="rounded bg-foreground/8 px-1 text-2xs text-muted-foreground">{t(`error.kind.${item.kind}`)}</span>
                {item.count > 1 && (
                  <span className="rounded bg-[var(--color-danger)]/20 px-1 font-[family-name:var(--font-mono)] text-2xs text-[var(--color-danger)]">
                    ×{item.count}
                  </span>
                )}
              </div>

              <p className="mt-1 font-[family-name:var(--font-mono)] text-sm break-words text-[var(--color-danger)]">
                {item.message}
              </p>

              {item.source !== undefined && (
                <p className="mt-0.5 font-[family-name:var(--font-mono)] text-2xs break-all text-muted-foreground">
                  {item.source}
                </p>
              )}

              {open && item.stack !== undefined && (
                <pre className="rh-scroll mt-1.5 max-h-32 overflow-auto rounded border border-border bg-bg/40 p-2 font-[family-name:var(--font-mono)] text-2xs whitespace-pre-wrap text-muted-foreground">
                  {item.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
