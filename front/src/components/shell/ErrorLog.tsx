import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, Copy, Trash2, X } from 'lucide-react'
import { clearErrors, subscribe, type ClientError } from '../../lib/clientErrors'

const KIND_LABEL: Record<ClientError['kind'], string> = {
  render: 'рендер',
  window: 'скрипт',
  rejection: 'промис',
}

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
          `[${timeOf(item.at)}] ${KIND_LABEL[item.kind]}${item.count > 1 ? ` ×${item.count}` : ''}`,
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
          <span className="text-[12px] text-fg/80">
            {total === 1 ? 'Ошибка в интерфейсе' : `Ошибок в интерфейсе: ${total}`}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={copyAll}
              title="Скопировать все"
              aria-label="Скопировать все ошибки"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-fg/40 transition-colors hover:bg-fg/10 hover:text-fg"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={clearErrors}
              title="Очистить"
              aria-label="Очистить список ошибок"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-fg/40 transition-colors hover:bg-fg/10 hover:text-fg"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              title={open ? 'Свернуть' : 'Развернуть'}
              aria-label={open ? 'Свернуть' : 'Развернуть'}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-fg/40 transition-colors hover:bg-fg/10 hover:text-fg"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : 'rotate-180'}`} />
            </button>
            <button
              type="button"
              onClick={() => setDismissed(Math.max(...fresh.map((item) => item.id)))}
              title="Скрыть до следующей ошибки"
              aria-label="Скрыть панель"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-fg/40 transition-colors hover:bg-fg/10 hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className={`rh-scroll overflow-y-auto ${open ? 'max-h-72' : 'max-h-24'}`}>
          {fresh.map((item) => (
            <div key={item.id} className="border-b border-fg/6 px-3 py-2 last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-fg/30">
                  {timeOf(item.at)}
                </span>
                <span className="rounded bg-fg/8 px-1 text-[10px] text-fg/45">{KIND_LABEL[item.kind]}</span>
                {item.count > 1 && (
                  <span className="rounded bg-[var(--color-danger)]/20 px-1 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-danger)]">
                    ×{item.count}
                  </span>
                )}
              </div>

              <p className="mt-1 font-[family-name:var(--font-mono)] text-[12px] break-words text-[var(--color-danger)]">
                {item.message}
              </p>

              {item.source !== undefined && (
                <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[10px] break-all text-fg/35">
                  {item.source}
                </p>
              )}

              {open && item.stack !== undefined && (
                <pre className="rh-scroll mt-1.5 max-h-32 overflow-auto rounded border border-fg/8 bg-bg/40 p-2 font-[family-name:var(--font-mono)] text-[10px] whitespace-pre-wrap text-fg/45">
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
