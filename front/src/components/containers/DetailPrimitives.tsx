import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Copy, X } from 'lucide-react'

/** Общие мелочи детальной страницы: панель, поле, плитка, чип, копирование. */

export const TONE_TEXT = {
  default: 'text-fg/80',
  muted: 'text-fg/30',
  accent: 'text-[var(--color-ember-300)]',
  ok: 'text-[var(--color-mint-400)]',
  warn: 'text-[var(--color-amber-ok)]',
  danger: 'text-[var(--color-danger)]',
  sky: 'text-[var(--color-sky-400)]',
} as const

export type Tone = keyof typeof TONE_TEXT

export const EMPTY_MARK = '—'

/** Русская форма слова по числу: 1 переменная, 2 переменные, 5 переменных. */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const mod100 = count % 100
  const mod10 = count % 10

  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]

  return forms[2]
}

export function formatDateTime(ts: number | null): string {
  if (ts === null || !Number.isFinite(ts) || ts <= 0) return EMPTY_MARK

  return new Date(ts).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'medium' })
}

interface DetailPanelProps {
  title: string
  icon: ReactNode
  /** Подпись рядом с заголовком — счётчики и пояснения. */
  hint?: string
  right?: ReactNode
  children: ReactNode
}

export function DetailPanel({ title, icon, hint, right, children }: DetailPanelProps) {
  return (
    <section className="rh-panel p-3">
      <header className="mb-2 flex min-h-7 items-center gap-2">
        <span className="text-[var(--color-ember-400)]">{icon}</span>
        <h2 className="text-[12px] tracking-wide text-fg/70">{title}</h2>
        {hint !== undefined && <span className="text-[11px] text-fg/30">{hint}</span>}
        {right !== undefined && <div className="ml-auto flex items-center gap-1.5">{right}</div>}
      </header>
      {children}
    </section>
  )
}

interface DetailFieldProps {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
  tone?: Tone
}

export function DetailField({ label, value, mono = true, copyable = false, tone = 'default' }: DetailFieldProps) {
  const filled = value.trim() !== ''
  const text = filled ? value : EMPTY_MARK

  return (
    <div className="flex items-center gap-3 rounded-lg border border-fg/6 bg-fg/[0.015] px-3 py-2">
      <span className="w-[132px] shrink-0 text-[11px] text-fg/40">{label}</span>
      <span
        title={filled ? value : undefined}
        className={[
          'min-w-0 flex-1 truncate text-[12px]',
          mono ? 'font-[family-name:var(--font-mono)]' : '',
          filled ? TONE_TEXT[tone] : TONE_TEXT.muted,
        ].join(' ')}
      >
        {text}
      </span>
      {copyable && filled && <CopyButton value={value} />}
    </div>
  )
}

interface DetailTileProps {
  label: string
  value: string
  hint?: string
  tone?: Tone
}

export function DetailTile({ label, value, hint, tone = 'default' }: DetailTileProps) {
  return (
    <div className="rounded-lg border border-fg/6 bg-fg/[0.015] px-3 py-2">
      <div className="text-[11px] text-fg/35">{label}</div>
      <div className={`mt-0.5 truncate font-[family-name:var(--font-mono)] text-[15px] ${TONE_TEXT[tone]}`}>
        {value}
      </div>
      {hint !== undefined && <div className="truncate text-[11px] text-fg/30">{hint}</div>}
    </div>
  )
}

export function Chip({ children, tone = 'sky' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded bg-fg/6 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] ${TONE_TEXT[tone]}`}
    >
      {children}
    </span>
  )
}

export function EmptyNote({ text }: { text: string }) {
  return <div className="flex h-16 items-center justify-center text-[12px] text-fg/25">{text}</div>
}

/** Кнопка копирования: галочка при успехе, крестик если буфер недоступен. */
export function CopyButton({ value, label = 'Скопировать' }: { value: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const reset = useCallback((next: 'done' | 'error') => {
    setStatus(next)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus('idle'), 1400)
  }, [])

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(
      () => reset('done'),
      () => reset('error'),
    )
  }, [reset, value])

  const title = status === 'error' ? 'Буфер обмена недоступен' : status === 'done' ? 'Скопировано' : label

  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      aria-label={title}
      className={[
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
        status === 'done'
          ? 'text-[var(--color-mint-400)]'
          : status === 'error'
            ? 'text-[var(--color-danger)]'
            : 'text-fg/35 hover:bg-fg/10 hover:text-fg',
      ].join(' ')}
    >
      {status === 'done' ? (
        <Check className="h-3.5 w-3.5" />
      ) : status === 'error' ? (
        <X className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}
