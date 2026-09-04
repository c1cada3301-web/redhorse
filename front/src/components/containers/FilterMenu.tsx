import { useEffect, useRef, useState } from 'react'
import { ListFilter, X } from 'lucide-react'
import {
  DEFAULT_FILTERS,
  countActive,
  type ContainerFilterState,
  type FilterOptions,
  type HealthFilter,
  type SortKey,
} from './filters'

const HEALTH: { key: HealthFilter; label: string }[] = [
  { key: 'any', label: 'Любое' },
  { key: 'healthy', label: 'Здоров' },
  { key: 'unhealthy', label: 'Проблемы' },
  { key: 'starting', label: 'Запускается' },
  { key: 'none', label: 'Без проверки' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Имя' },
  { key: 'cpu', label: 'CPU' },
  { key: 'mem', label: 'Память' },
  { key: 'size', label: 'Размер' },
  { key: 'uptime', label: 'Аптайм' },
  { key: 'restarts', label: 'Рестарты' },
]

const FIELD =
  'w-full rounded-lg border border-fg/12 bg-fg/[0.03] px-2.5 py-1.5 text-[12px] text-body outline-none transition focus:border-[var(--color-ember-500)]/50'

interface FilterMenuProps {
  value: ContainerFilterState
  onChange: (next: ContainerFilterState) => void
  options: FilterOptions
}

export function FilterMenu({ value, onChange, options }: FilterMenuProps) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const active = countActive(value)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (boxRef.current !== null && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const patch = (part: Partial<ContainerFilterState>) => onChange({ ...value, ...part })

  // '' в <select> означает «без ограничения»: значение null в DOM не хранится.
  const pick = (raw: string) => (raw === '' ? null : raw)

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Фильтры"
        className={[
          'flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors',
          active > 0 || open
            ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
            : 'border-fg/8 bg-fg/[0.02] text-fg/50 hover:text-fg/85',
        ].join(' ')}
      >
        <ListFilter className="h-3.5 w-3.5" />
        Фильтры
        {active > 0 && (
          <span className="rounded bg-[var(--color-ember-500)]/25 px-1 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ember-300)]">
            {active}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-30 w-64 rounded-xl border border-fg/10 bg-[var(--color-ink-850)] p-3 shadow-2xl shadow-black/50">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] tracking-wider text-fg/35 uppercase">Отбор</span>
            {active > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...DEFAULT_FILTERS, sort: value.sort, desc: value.desc })}
                className="flex items-center gap-1 text-[11px] text-fg/45 transition-colors hover:text-[var(--color-ember-300)]"
              >
                <X className="h-3 w-3" />
                Сбросить
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <label className="block">
              <span className="mb-1 block text-[11px] text-fg/45">Стек</span>
              <select
                value={value.stack ?? ''}
                onChange={(event) => patch({ stack: pick(event.target.value) })}
                className={FIELD}
              >
                <option value="">Любой</option>
                {options.stacks.map((stack) => (
                  <option key={stack} value={stack}>
                    {stack}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] text-fg/45">Образ</span>
              <select
                value={value.image ?? ''}
                onChange={(event) => patch({ image: pick(event.target.value) })}
                className={FIELD}
              >
                <option value="">Любой</option>
                {options.images.map((image) => (
                  <option key={image} value={image}>
                    {image}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] text-fg/45">Сеть</span>
              <select
                value={value.network ?? ''}
                onChange={(event) => patch({ network: pick(event.target.value) })}
                className={FIELD}
              >
                <option value="">Любая</option>
                {options.networks.map((network) => (
                  <option key={network} value={network}>
                    {network}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] text-fg/45">Здоровье</span>
              <select
                value={value.health}
                onChange={(event) => patch({ health: event.target.value as HealthFilter })}
                className={FIELD}
              >
                {HEALTH.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fg/60">
              <input
                type="checkbox"
                checked={value.publishedOnly}
                onChange={(event) => patch({ publishedOnly: event.target.checked })}
                className="size-3.5 accent-[var(--color-ember-500)]"
              />
              Только с проброшенными портами
            </label>
          </div>

          <div className="mt-3 border-t border-fg/8 pt-2.5">
            <span className="mb-1 block text-[11px] tracking-wider text-fg/35 uppercase">Сортировка</span>
            <div className="flex gap-2">
              <select
                value={value.sort}
                onChange={(event) => patch({ sort: event.target.value as SortKey })}
                className={FIELD}
              >
                {SORTS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => patch({ desc: !value.desc })}
                title={value.desc ? 'По убыванию' : 'По возрастанию'}
                className="shrink-0 rounded-lg border border-fg/12 bg-fg/[0.03] px-2.5 text-[12px] text-fg/60 transition-colors hover:text-fg/90"
              >
                {value.desc ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
