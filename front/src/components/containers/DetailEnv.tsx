import { useCallback, useMemo, useState } from 'react'
import { Eye, EyeOff, Search, Variable } from 'lucide-react'
import type { EnvVar } from '../../api/types'
import { HIDDEN_VALUE, isSensitiveEnv } from '../../lib/envSecrets'
import { CopyButton, DetailPanel, EMPTY_MARK, EmptyNote, plural } from './DetailPrimitives'
import { useT } from '@/state/settings'

/** Поиск показываем только когда переменных много — иначе он лишний шум. */
const SEARCH_THRESHOLD = 10

interface EnvRow extends EnvVar {
  sensitive: boolean
}

export function DetailEnv({ env }: { env: EnvVar[] }) {
  const t = useT()
  const [revealAll, setRevealAll] = useState(false)
  // Значения скрыты по умолчанию — все, а не только распознанные как секреты.
  // Автоопределение ошибается в обе стороны, а окружение контейнера сплошь и
  // рядом открыто при демонстрации экрана. Показ — всегда осознанное действие.
  const [hideAll, setHideAll] = useState(true)
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set())
  const [query, setQuery] = useState('')

  const rows = useMemo<EnvRow[]>(
    () => env.map((item) => ({ ...item, sensitive: isSensitiveEnv(item.key, item.value) })),
    [env],
  )

  const sensitiveCount = rows.filter((row) => row.sensitive).length
  const hiddenCount = hideAll
    ? rows.filter((row) => row.value !== '').length
    : revealAll
      ? 0
      : rows.filter((row) => row.sensitive && !revealed.has(row.key)).length

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

  // «Спрятать всё» и «показать секреты» — взаимоисключающие режимы.
  const toggleHideAll = useCallback(() => {
    setHideAll((current) => {
      if (!current) {
        setRevealAll(false)
        setRevealed(new Set())
      }

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
      title={t('detail.env')}
      icon={<Variable className="h-4 w-4" />}
      hint={hint}
      right={
        <div className="flex items-center gap-1.5">
          {/* Кнопка видна всегда: иначе непонятно, есть ли вообще такой режим. */}
          <button
            type="button"
            onClick={toggleAll}
            disabled={sensitiveCount === 0 || hideAll}
            aria-pressed={revealAll}
            title={
              sensitiveCount === 0
                ? t('detail.noSecrets')
                : hideAll
                  ? t('detail.hideAllFirst')
                  : revealAll
                    ? t('detail.hideSecretsHint')
                    : t('detail.showSecretsHint')
            }
            className={[
              'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
              sensitiveCount === 0 || hideAll
                ? 'cursor-not-allowed border-border bg-fg/[0.02] text-muted-foreground'
                : revealAll
                  ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]'
                  : 'border-border bg-fg/5 text-muted-foreground hover:border-border hover:text-foreground',
            ].join(' ')}
          >
            {revealAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealAll ? t('detail.hideSecrets') : t('detail.showSecrets')}
          </button>

          <button
            type="button"
            onClick={toggleHideAll}
            aria-pressed={hideAll}
            title={hideAll ? t('detail.showAllHint') : t('detail.hideAllHint')}
            className={[
              'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
              hideAll
                ? 'border-[var(--color-amber-ok)]/45 bg-[var(--color-amber-ok)]/15 text-[var(--color-amber-ok)]'
                : 'border-border bg-fg/5 text-muted-foreground hover:border-[var(--color-amber-ok)]/40 hover:text-[var(--color-amber-ok)]',
            ].join(' ')}
          >
            <EyeOff className="h-3.5 w-3.5" />
            {hideAll ? t('detail.showAll') : t('detail.hideAll')}
          </button>
        </div>
      }
    >
      {rows.length > SEARCH_THRESHOLD && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-foreground/3 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('detail.envSearch')}
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-mono)] text-sm text-foreground/90 outline-none placeholder:text-muted-foreground"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              сброс
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyNote text={t('detail.noEnv')} />
      ) : visible.length === 0 ? (
        <EmptyNote text={t('common.empty')} />
      ) : (
        <div className="space-y-1">
          {visible.map((row) => (
            <EnvRowItem
              key={row.key}
              row={row}
              revealed={!hideAll && (revealAll || revealed.has(row.key))}
              forceHidden={hideAll}
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
  /** Режим «спрятать всё»: маскируем даже то, что чувствительным не считается. */
  forceHidden: boolean
  onToggle: () => void
}

function EnvRowItem({ row, revealed, forceHidden, onToggle }: EnvRowItemProps) {
  const t = useT()
  const empty = row.value === ''
  const masked = forceHidden ? !empty : row.sensitive && !revealed
  const shown = masked ? HIDDEN_VALUE : row.value

  return (
    <div className="flex items-center gap-3 rounded-md bg-foreground/3 px-3 py-1.5 hover:bg-fg/[0.03]">
      <span
        title={row.key}
        className="w-[220px] shrink-0 truncate font-[family-name:var(--font-mono)] text-sm text-foreground/75"
      >
        {row.key}
      </span>

      <span
        title={masked ? t('detail.valueHidden') : row.value}
        className={[
          'min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-sm',
          empty ? 'text-muted-foreground' : masked ? 'text-[var(--color-amber-ok)]/80' : 'text-foreground/90',
        ].join(' ')}
      >
        {empty ? EMPTY_MARK : shown}
      </span>

      {row.sensitive && !forceHidden && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={revealed}
          title={revealed ? t('detail.hideValue') : t('detail.showValue')}
          aria-label={revealed ? t('detail.hideValue') : t('detail.showValue')}
          className={[
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
            revealed
              ? 'text-[var(--color-ember-300)] hover:bg-fg/10'
              : 'text-muted-foreground hover:bg-fg/10 hover:text-foreground',
          ].join(' ')}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Копируем настоящее значение даже под маской: пользователь нажал осознанно. */}
      {!empty && <CopyButton value={row.value} label={t('detail.copyValue')} />}
    </div>
  )
}
