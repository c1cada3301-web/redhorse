import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarClock } from 'lucide-react'
import type { TimeRange } from '../../lib/timeRange'
import {
  PRESETS,
  describeRange,
  isLive,
  parseLocalDateTime,
  toLocalDateTimeValue,
} from '../../lib/timeRange'

interface TimeRangePickerProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

const HOUR = 3_600_000

const FIELD_CLASS = [
  'h-7 w-full rounded-md border border-white/8 bg-black/30 px-1.5',
  'font-[family-name:var(--font-mono)] text-[11px] text-white/85 outline-none',
  'transition-colors [color-scheme:dark] focus:border-[var(--color-ember-500)]/60',
].join(' ')

/** Стартовые значения полей: текущее окно либо последний час. */
function initialBounds(range: TimeRange): { from: string; to: string } {
  if (range.mode === 'window') {
    return { from: toLocalDateTimeValue(range.from), to: toLocalDateTimeValue(range.to) }
  }

  const now = Date.now()

  return { from: toLocalDateTimeValue(now - HOUR), to: toLocalDateTimeValue(now) }
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [bounds, setBounds] = useState(() => initialBounds(value))
  const [error, setError] = useState<string | null>(null)

  const live = isLive(value)
  const activeKey = value.mode === 'live'
    ? PRESETS.find((preset) => preset.sinceMs === value.sinceMs)?.key
    : undefined

  const handleOpenChange = (next: boolean) => {
    setOpen(next)

    // При открытии подставляем актуальные границы и прячем прошлую ошибку
    if (next) {
      setBounds(initialBounds(value))
      setError(null)
    }
  }

  const handlePreset = (sinceMs: number | null) => {
    onChange({ mode: 'live', sinceMs })
    setOpen(false)
  }

  const handleApply = () => {
    const from = parseLocalDateTime(bounds.from)
    const to = parseLocalDateTime(bounds.to)

    if (from === null || to === null) {
      setError('Заполните обе даты')
      return
    }

    if (from >= to) {
      setError('«С» должно быть раньше «по»')
      return
    }

    setError(null)
    onChange({ mode: 'window', from, to })
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Диапазон времени"
          aria-label="Диапазон времени"
          className={[
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2',
            'text-xs transition-colors duration-150',
            open || !live
              ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]'
              : 'border-white/8 bg-black/30 text-white/70 hover:border-white/15 hover:text-white',
          ].join(' ')}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span className="font-[family-name:var(--font-mono)] text-[11px] whitespace-nowrap">
            {describeRange(value)}
          </span>
          {live && (
            <span className="rh-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-ember-400)]" />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="rh-panel rh-fade-in z-50 w-60 p-1.5 shadow-2xl shadow-black/50"
        >
          <div className="flex flex-col gap-0.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePreset(preset.sinceMs)}
                className={[
                  'rounded-md px-2 py-1 text-left text-xs transition-colors',
                  activeKey === preset.key
                    ? 'bg-[var(--color-ember-500)]/20 text-[var(--color-ember-300)]'
                    : 'text-white/65 hover:bg-white/8 hover:text-white',
                ].join(' ')}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="my-1.5 h-px bg-white/8" />

          <div className="flex flex-col gap-1.5 px-1 pb-1">
            <span className="text-[10px] tracking-wide text-white/30 uppercase">Произвольное окно</span>

            <label className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-[11px] text-white/40">с</span>
              <input
                type="datetime-local"
                value={bounds.from}
                onChange={(event) => setBounds({ ...bounds, from: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>

            <label className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-[11px] text-white/40">по</span>
              <input
                type="datetime-local"
                value={bounds.to}
                onChange={(event) => setBounds({ ...bounds, to: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>

            {error !== null && (
              <span className="text-[11px] text-[var(--color-danger)]">{error}</span>
            )}

            <button
              type="button"
              onClick={handleApply}
              className={[
                'h-7 rounded-md bg-[var(--color-ember-500)]/85 text-xs font-medium text-white',
                'transition-colors hover:bg-[var(--color-ember-500)]',
              ].join(' ')}
            >
              Применить
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
