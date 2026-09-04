import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

const ROW = 'rounded-md bg-foreground/3 px-3 py-2.5'

export function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string
  hint?: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rh-panel p-3">
      <header className="mb-2.5 flex items-baseline gap-2">
        <span className="self-center text-[var(--color-ember-400)]">{icon}</span>
        <h2 className="text-sm tracking-wide text-foreground/75">{title}</h2>
        {hint !== undefined && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </header>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

export interface Choice {
  value: number
  label: string
}

/** Строка с подписью слева и рядом кнопок-вариантов справа. */
export function ChoiceRow({
  label,
  hint,
  choices,
  value,
  onChange,
}: {
  label: string
  hint: string
  choices: readonly Choice[]
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className={`${ROW} flex flex-wrap items-center gap-3`}>
      <div className="min-w-0 flex-1">
        <div className="text-base text-foreground/90">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>

      <div className="flex flex-wrap gap-1">
        {choices.map((choice) => {
          const active = choice.value === value

          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => onChange(choice.value)}
              aria-pressed={active}
              className={[
                'h-8 rounded-lg border px-2.5 font-[family-name:var(--font-mono)] text-xs transition-colors',
                active
                  ? 'border-[var(--color-ember-500)]/55 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]'
                  : 'border-border bg-bg/25 text-muted-foreground hover:text-foreground/90',
              ].join(' ')}
            >
              {choice.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className={`${ROW} flex items-center gap-3`}>
      <div className="min-w-0 flex-1">
        <div className="text-base text-foreground/90">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-[var(--color-ember-500)]/60 bg-[var(--color-ember-500)]/35'
            : 'border-border bg-bg/35',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all',
            checked ? 'left-[18px] bg-[var(--color-ember-300)]' : 'left-[3px] bg-fg/40',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

export function SliderRow({
  label,
  hint,
  value,
  valueLabel,
  min,
  max,
  onChange,
}: {
  label: string
  hint: string
  value: number
  valueLabel: string
  min: number
  max: number
  onChange: (next: number) => void
}) {
  return (
    <div className={`${ROW} flex flex-wrap items-center gap-3`}>
      <div className="min-w-0 flex-1">
        <div className="text-base text-foreground/90">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-40 cursor-pointer appearance-none rounded-full bg-fg/12 accent-[var(--color-ember-500)]"
      />

      <span className="w-14 text-right font-[family-name:var(--font-mono)] text-sm text-foreground/90">
        {valueLabel}
      </span>
    </div>
  )
}

/** Значение только для чтения: адрес сокета, версия сервера, характеристики хоста. */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${ROW} flex items-center justify-between gap-3 py-2`}>
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="truncate font-[family-name:var(--font-mono)] text-sm text-foreground/90">
        {value}
      </span>
    </div>
  )
}

export function LanguageCard({
  nativeLabel,
  label,
  active,
  onSelect,
}: {
  nativeLabel: string
  label: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={[
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-[var(--color-ember-500)]/55 bg-[var(--color-ember-500)]/12'
          : 'border-border bg-fg/[0.015] hover:border-border',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className={`truncate text-base ${active ? 'text-[var(--color-ember-300)]' : 'text-foreground/90'}`}>
          {nativeLabel}
        </div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>

      {active && <Check className="h-4 w-4 shrink-0 text-[var(--color-ember-400)]" />}
    </button>
  )
}
