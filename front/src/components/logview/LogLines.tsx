import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogLine, LogViewOptions } from '../../types'
import { formatTime } from '../../lib/format'
import { visibleText } from '../../lib/maskCache'

/** Межстрочный интервал списка — должен совпадать с lineHeight контейнера. */
const LINE_HEIGHT = 1.55
/** Минимальная высота строки: её задаёт метка уровня (mt-[6px] + h-[10px]). */
const MIN_ROW_HEIGHT = 16
/** Запас строк за пределами вьюпорта — без него при быстрой прокрутке видны пустоты. */
const OVERSCAN = 20
/** Допуск в пикселях, при котором считаем, что список прокручен вниз. */
const BOTTOM_EPS = 24

const LEVEL_COLOR: Record<LogLine['level'], string> = {
  debug: 'text-white/40',
  info: 'text-white/80',
  warn: 'text-[var(--color-amber-ok)]',
  error: 'text-[var(--color-danger)]',
}

const LEVEL_BAR: Record<LogLine['level'], string> = {
  debug: 'bg-white/10',
  info: 'bg-[var(--color-sky-400)]/50',
  warn: 'bg-[var(--color-amber-ok)]',
  error: 'bg-[var(--color-danger)]',
}

interface LogLinesProps {
  lines: LogLine[]
  options: LogViewOptions
  onUserScroll: (atBottom: boolean) => void
}

function highlight(text: string, needle: string) {
  if (needle.trim() === '') return text

  const lower = text.toLowerCase()
  const target = needle.toLowerCase()
  const chunks: React.ReactNode[] = []
  let cursor = 0

  while (cursor < text.length) {
    const found = lower.indexOf(target, cursor)

    if (found === -1) {
      chunks.push(text.slice(cursor))
      break
    }

    if (found > cursor) chunks.push(text.slice(cursor, found))

    chunks.push(
      <mark
        key={`${found}-${chunks.length}`}
        className="rounded-[3px] bg-[var(--color-ember-500)]/35 px-[2px] text-[var(--color-ember-300)]"
      >
        {text.slice(found, found + target.length)}
      </mark>,
    )

    cursor = found + target.length
  }

  return chunks
}

export function LogLines({ lines, options, onUserScroll }: LogLinesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  /** Последняя известная ширина контейнера — её смена меняет переносы. */
  const widthRef = useRef(0)
  /** Флаг «скроллим сами» — такой скролл не должен снимать follow. */
  const selfScrollRef = useRef(false)
  const rafRef = useRef(0)

  const rowHeight = Math.max(Math.round(options.fontSize * LINE_HEIGHT), MIN_ROW_HEIGHT)

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    // Без переноса высота фиксированная, с переносом это лишь стартовая оценка.
    estimateSize: () => rowHeight,
    // Ключ по id строки: буфер обрезается сверху, индексы съезжают, id — нет.
    getItemKey: (index) => lines[index]?.id ?? index,
    overscan: OVERSCAN,
  })

  // Реальный замер нужен только при переносе строк — иначе высота известна заранее.
  const measureRef = options.wrap ? virtualizer.measureElement : undefined

  const pinToBottom = useCallback(() => {
    if (lines.length === 0) return

    selfScrollRef.current = true
    virtualizer.scrollToIndex(lines.length - 1, { align: 'end' })

    // Событие scroll долетает раньше следующего кадра — там и снимаем флаг.
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      selfScrollRef.current = false
    })
  }, [virtualizer, lines.length])

  // Смена wrap или размера шрифта делает кеш замеров недействительным.
  useLayoutEffect(() => {
    virtualizer.measure()
  }, [virtualizer, options.wrap, options.fontSize])

  // Ширина контейнера влияет на переносы — пересчитываем высоты строк.
  useEffect(() => {
    const node = scrollRef.current
    if (node === null) return

    widthRef.current = node.clientWidth

    const observer = new ResizeObserver(() => {
      if (node.clientWidth === widthRef.current) return

      widthRef.current = node.clientWidth
      virtualizer.measure()
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [virtualizer])

  // Автопрокрутка: новые строки, смена шрифта или переноса держат список внизу.
  useLayoutEffect(() => {
    if (!options.follow) return

    pinToBottom()
  }, [pinToBottom, options.follow, options.wrap, options.fontSize, lines])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  useEffect(() => {
    const node = scrollRef.current
    if (node === null) return

    const handle = () => {
      const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight < BOTTOM_EPS

      // Наш собственный скролл не считаем уходом пользователя вверх.
      if (!atBottom && selfScrollRef.current) return

      onUserScroll(atBottom)
    }

    node.addEventListener('scroll', handle, { passive: true })
    return () => node.removeEventListener('scroll', handle)
  }, [onUserScroll])

  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/35">
        Нет строк под текущим фильтром
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="rh-scroll h-full overflow-auto px-1 py-1"
      style={{ fontSize: options.fontSize, lineHeight: LINE_HEIGHT }}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const line = lines[item.index]
          if (line === undefined) return null

          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={measureRef}
              style={{ transform: `translateY(${item.start}px)` }}
              className={[
                'group absolute top-0 left-0 flex w-full gap-2 rounded px-2',
                'font-[family-name:var(--font-mono)] hover:bg-white/[0.045]',
                options.wrap ? 'items-start' : 'items-center',
              ].join(' ')}
            >
              <span
                className={`mt-[6px] h-[10px] w-[2px] shrink-0 rounded ${LEVEL_BAR[line.level]}`}
              />

              {options.showTimestamps && (
                <span className="shrink-0 tabular-nums text-white/28 select-none">
                  {formatTime(line.ts)}
                </span>
              )}

              <span
                className={[
                  LEVEL_COLOR[line.level],
                  options.wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
                  'flex-1',
                ].join(' ')}
              >
                {highlight(visibleText(line, options.masked), options.search)}
              </span>

              {line.stream === 'stderr' && (
                <span className="shrink-0 rounded bg-[var(--color-danger)]/12 px-1 text-[10px] text-[var(--color-danger)]/80 opacity-0 group-hover:opacity-100">
                  stderr
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
