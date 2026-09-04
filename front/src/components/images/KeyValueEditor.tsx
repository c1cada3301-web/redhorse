import { Plus, Trash2 } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { GHOST_BUTTON, MONO_FIELD_CLASS, TEXTAREA_CLASS } from './styles'
import { useT } from '@/state/settings'

export interface Pair {
  /** Ключ для React: сами поля пустыми и одинаковыми быть могут. */
  id: string
  key: string
  value: string
}

let counter = 0

export function createPair(key = '', value = ''): Pair {
  counter += 1
  return { id: `pair-${counter}`, key, value }
}

/** Пустые ключи отбрасываем — бэкенду они не нужны. */
export function toRecord(rows: Pair[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const key = row.key.trim()
    if (key === '') return acc

    return { ...acc, [key]: row.value }
  }, {})
}

interface KeyValueEditorProps {
  rows: Pair[]
  keyPlaceholder: string
  valuePlaceholder: string
  addLabel: string
  /** Значение — многострочное (содержимое файла контекста). */
  multiline?: boolean
  onChange: (rows: Pair[]) => void
}

export function KeyValueEditor({
  rows,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
  multiline = false,
  onChange,
}: KeyValueEditorProps) {
  const t = useT()
  const patch = (id: string, field: 'key' | 'value', value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const remove = (id: string) => onChange(rows.filter((row) => row.id !== id))

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className={multiline ? 'space-y-1.5 rounded-lg border border-border p-2' : 'flex items-center gap-2'}
        >
          <div className={multiline ? 'flex items-center gap-2' : 'contents'}>
            <input
              value={row.key}
              onChange={(event) => patch(row.id, 'key', event.target.value)}
              placeholder={keyPlaceholder}
              spellCheck={false}
              className={`${MONO_FIELD_CLASS} ${multiline ? 'flex-1' : 'w-[40%]'}`}
            />

            {!multiline && (
              <input
                value={row.value}
                onChange={(event) => patch(row.id, 'value', event.target.value)}
                placeholder={valuePlaceholder}
                spellCheck={false}
                className={`${MONO_FIELD_CLASS} flex-1`}
              />
            )}

            <IconButton label={t('kv.removeRow')} tone="danger" onClick={() => remove(row.id)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>

          {multiline && (
            <textarea
              value={row.value}
              onChange={(event) => patch(row.id, 'value', event.target.value)}
              placeholder={valuePlaceholder}
              spellCheck={false}
              rows={4}
              className={TEXTAREA_CLASS}
            />
          )}
        </div>
      ))}

      <button type="button" onClick={() => onChange([...rows, createPair()])} className={GHOST_BUTTON}>
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  )
}
