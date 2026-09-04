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
import { useT } from '@/state/settings'

interface TimeRangePickerProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

const HOUR = 3_600_000

const FIELD_CLASS = [
  'h-7 w-full rounded-md border border-border bg-bg/30 px-1.5',
  'font-[family-name:var(--font-mono)] text-xs text-foreground/90 outline-none',
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
  const t = useT()
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
      setError(t('logs.range.fillBoth'))
      return
    }

    if (from >= to) {
      setError(t('logs.range.order'))
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
          title={t('logs.range.title')}
          aria-label={t('logs.range.title')}
          className={[
            'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2',
            'text-xs transition-colors duration-150',
            open || !live
              ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]'
              : 'border-border bg-bg/30 text-foreground/75 hover:border-border hover:text-foreground',
          ].join(' ')}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span className="font-[family-name:var(--font-mono)] text-xs whitespace-nowrap">
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
                    : 'text-foreground/75 hover:bg-fg/8 hover:text-foreground',
                ].join(' ')}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="my-1.5 h-px bg-fg/8" />

          <div className="flex flex-col gap-1.5 px-1 pb-1">
            <span className="text-2xs tracking-wide text-muted-foreground uppercase">{t('logs.range.custom')}</span>

            <label className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-xs text-muted-foreground">{t('logs.range.from')}</span>
              <input
                type="datetime-local"
                value={bounds.from}
                onChange={(event) => setBounds({ ...bounds, from: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>

            <label className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-xs text-muted-foreground">{t('logs.range.to')}</span>
              <input
                type="datetime-local"
                value={bounds.to}
                onChange={(event) => setBounds({ ...bounds, to: event.target.value })}
                className={FIELD_CLASS}
              />
            </label>

            {error !== null && (
              <span className="text-xs text-[var(--color-danger)]">{error}</span>
            )}

            <button
              type="button"
              onClick={handleApply}
              className={[
                'h-7 rounded-md bg-[var(--color-ember-500)]/85 text-xs font-medium text-foreground',
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
