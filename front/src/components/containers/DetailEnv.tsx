import { useCallback, useMemo, useState } from 'react'
import { Eye, EyeOff, Search, Variable } from 'lucide-react'
import type { EnvVar } from '../../api/types'
import { displayEnvValue, isSensitiveEnv } from '../../lib/envSecrets'
import { CopyButton, DetailPanel, EMPTY_MARK, EmptyNote, plural } from './DetailPrimitives'

/** Поиск показываем только когда переменных много — иначе он лишний шум. */
const SEARCH_THRESHOLD = 10

interface EnvRow extends EnvVar {
  sensitive: boolean
}

export function DetailEnv({ env }: { env: EnvVar[] }) {
  const [revealAll, setRevealAll] = useState(false)
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [query, setQuery] = useState('')

  const rows = useMemo<EnvRow[]>(
    () => env.map((item) => ({ ...item, sensitive: isSensitiveEnv(item.key, item.value) })),
    [env],
  )

  const sensitiveCount = rows.filter((row) => row.sensitive).length
  const hiddenCount = revealAll ? 0 : rows.filter((row) => row.sensitive && !revealed.has(row.key)).length

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return rows

    return rows.filter((row) => row.key.toLowerCase().includes(needle))
  }, [query, rows])

  // Set пересоздаём: мутировать состояние нельзя, React не заметит изменения.
  const toggleRow = useCallback(
    (key: string) => {
      if (revealAll) {
        // Под общим показом точечный глазик прячет одну строку: выключаем общий
        // режим и раскрываем остальные секреты поимённо.
        setRevealAll(false)
        setRevealed(new Set(rows.filter((row) => row.sensitive && row.key !== key).map((row) => row.key)))

        return
      }

      setRevealed((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)

        return next
      })
    },
    [revealAll, rows],
  )

  // Общий глазик выключает и точечные раскрытия — «скрыть всё» должно скрывать всё.
  const toggleAll = useCallback(() => {
    setRevealAll((current) => {
      if (current) setRevealed(new Set())

      return !current
    })
  }, [])

  const hint = [
    `${rows.length} ${plural(rows.length, ['переменная', 'переменные', 'переменных'])}`,
    hiddenCount > 0 ? `${hiddenCount} ${plural(hiddenCount, ['скрыта', 'скрыты', 'скрыто'])}` : null,
  ]
    .filter((part) => part !== null)
    .join(', ')

  return (
    <DetailPanel
      title="Переменные окружения"
      icon={<Variable className="h-4 w-4" />}
      hint={hint}
      right={
        sensitiveCount > 0 ? (
          <button
            type="button"
            onClick={toggleAll}
            aria-pressed={revealAll}
            title={revealAll ? 'Скрыть все чувствительные значения' : 'Показать все чувствительные значения'}
            className={[
              'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors',
              revealAll
                ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]'
                : 'border-white/10 bg-white/5 text-white/55 hover:border-[var(--color-ember-500)]/40 hover:text-[var(--color-ember-300)]',
            ].join(' ')}
          >
            {revealAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealAll ? 'Скрыть секреты' : 'Показать секреты'}
          </button>
        ) : undefined
      }
    >
      {rows.length > SEARCH_THRESHOLD && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/8 bg-black/25 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по имени переменной"
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-mono)] text-[12px] text-white/80 outline-none placeholder:text-white/25"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[11px] text-white/35 transition-colors hover:text-white"
            >
              сброс
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyNote text="Переменных окружения нет" />
      ) : visible.length === 0 ? (
        <EmptyNote text="Ничего не найдено" />
      ) : (
        <div className="space-y-1">
          {visible.map((row) => (
            <EnvRowItem
              key={row.key}
              row={row}
              revealed={revealAll || revealed.has(row.key)}
              onToggle={() => toggleRow(row.key)}
            />
          ))}
        </div>
      )}
    </DetailPanel>
  )
}

interface EnvRowItemProps {
  row: EnvRow
  revealed: boolean
  onToggle: () => void
}

function EnvRowItem({ row, revealed, onToggle }: EnvRowItemProps) {
  const shown = displayEnvValue(row.key, row.value, revealed)
  const masked = row.sensitive && !revealed
  const empty = row.value === ''

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.015] px-3 py-1.5 hover:bg-white/[0.03]">
      <span
        title={row.key}
        className="w-[220px] shrink-0 truncate font-[family-name:var(--font-mono)] text-[12px] text-white/60"
      >
        {row.key}
      </span>

      <span
        title={masked ? 'Значение скрыто' : row.value}
        className={[
          'min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-[12px]',
          empty ? 'text-white/25' : masked ? 'text-[var(--color-amber-ok)]/80' : 'text-white/85',
        ].join(' ')}
      >
        {empty ? EMPTY_MARK : shown}
      </span>

      {row.sensitive && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={revealed}
          title={revealed ? 'Скрыть значение' : 'Показать значение'}
          aria-label={revealed ? 'Скрыть значение' : 'Показать значение'}
          className={[
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
            revealed
              ? 'text-[var(--color-ember-300)] hover:bg-white/10'
              : 'text-white/35 hover:bg-white/10 hover:text-white',
          ].join(' ')}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Копируем настоящее значение даже под маской: пользователь нажал осознанно. */}
      {!empty && <CopyButton value={row.value} label="Скопировать значение" />}
    </div>
  )
}
