import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/state/settings'
import type { SortKey } from './filters'

interface ColumnHeaderProps {
  label: string
  /** null — колонка не сортируется (например блок кнопок). */
  sortKey?: SortKey
  active: SortKey
  desc: boolean
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
  className?: string
}

/**
 * Заголовок колонки. Сортировка живёт там, где на неё смотрят — в шапке
 * таблицы, а не только в меню фильтров: клик по колонке переключает
 * направление, повторный клик по другой колонке переносит сортировку на неё.
 */
export function ColumnHeader({
  label,
  sortKey,
  active,
  desc,
  onSort,
  align = 'left',
  className,
}: ColumnHeaderProps) {
  const t = useT()
  const isActive = sortKey !== undefined && sortKey === active

  if (sortKey === undefined) {
    return (
      <div className={cn('text-2xs tracking-wider text-muted-foreground uppercase', className)}>{label}</div>
    )
  }

  const Icon = isActive ? (desc ? ArrowDown : ArrowUp) : ChevronsUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      title={
        isActive
          ? t(desc ? 'containers.sortDesc' : 'containers.sortAsc')
          : t('containers.sortBy', { column: label })
      }
      className={cn(
        'group inline-flex items-center gap-1 text-2xs tracking-wider uppercase transition-colors',
        align === 'right' ? 'justify-end' : 'justify-start',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80',
        className,
      )}
    >
      {label}
      <Icon
        className={cn(
          'size-3 shrink-0 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
        )}
      />
    </button>
  )
}
