import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { keys } from '../../api/queries'
import type { JobStream } from '../../state/useJobStream'

interface JobConsoleProps {
  stream: JobStream
  /** Подпись под консолью, пока задача не завершилась. */
  runningLabel: string
  height?: string
}

/** Живой вывод задачи: моноширинный лог с автопрокруткой и плашкой результата. */
export function JobConsole({ stream, runningLabel, height = '46vh' }: JobConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const client = useQueryClient()

  // Пока лог идёт — держим низ. Прокрутка вверх пользователем не блокируется:
  // при следующей строке вернёмся вниз, что для короткого build-лога уместно.
  useEffect(() => {
    const node = scrollRef.current
    if (node === null) return

    node.scrollTop = node.scrollHeight
  }, [stream.events])

  // Успешная сборка или pull меняют список образов — обновляем его.
  useEffect(() => {
    if (stream.state !== 'success') return

    void client.invalidateQueries({ queryKey: keys.images })
  }, [client, stream.state])

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={scrollRef}
        style={{ height }}
        className="rh-scroll min-h-[200px] overflow-y-auto rounded-lg border border-fg/8 bg-bg/45 px-3 py-2 font-[family-name:var(--font-mono)] text-[12px] leading-[1.55]"
      >
        {stream.events.length === 0 ? (
          <p className="text-fg/30">Ожидаем вывод…</p>
        ) : (
          stream.events.map((event, index) => (
            <div
              key={`${event.ts}-${index}`}
              className={[
                'break-words whitespace-pre-wrap',
                event.stream === 'stderr' ? 'text-[var(--color-danger)]' : 'text-fg/75',
              ].join(' ')}
            >
              {event.text}
            </div>
          ))
        )}
      </div>

      <StatusBanner stream={stream} runningLabel={runningLabel} />
    </div>
  )
}

interface StatusBannerProps {
  stream: JobStream
  runningLabel: string
}

function StatusBanner({ stream, runningLabel }: StatusBannerProps) {
  if (stream.state === 'running') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-fg/8 bg-fg/[0.03] px-3 py-2 text-[12px] text-fg/55">
        <span className="rh-pulse h-1.5 w-1.5 rounded-full bg-[var(--color-ember-400)]" />
        {runningLabel}
      </div>
    )
  }

  if (stream.state === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-mint-400)]/35 bg-[var(--color-mint-400)]/10 px-3 py-2 text-[12px] text-[var(--color-mint-400)]">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Готово
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-[12px] text-[var(--color-danger)]">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="break-words whitespace-pre-wrap">
        {stream.error ?? 'Задача завершилась с ошибкой'}
      </span>
    </div>
  )
}
