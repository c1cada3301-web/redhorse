import { Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * Список строк, который можно наращивать: порты, тома, переменные.
 * Вынесен отдельно, потому что в форме таких блоков четыре и они одинаковы
 * во всём, кроме содержимого строки.
 */
interface RowListProps<T> {
  label: string
  items: T[]
  onChange: (items: T[]) => void
  empty: T
  addLabel: string
  children: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode
}

export function RowList<T>({ label, items, onChange, empty, addLabel, children }: RowListProps<T>) {
  const update = (index: number, patch: Partial<T>) => {
    onChange(items.map((item, position) => (position === index ? { ...item, ...patch } : item)))
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {children(item, (patch) => update(index, patch), index)}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(items.filter((_, position) => position !== index))}
            aria-label="—"
          >
            <X />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => onChange([...items, empty])} className="w-fit">
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
