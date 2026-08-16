/** Общие классы полей и кнопок диалогов образов. */

export const LABEL_CLASS = 'mb-1.5 block text-[11px] tracking-wider text-white/40 uppercase'

const FIELD_BASE = [
  'w-full rounded-lg border border-white/8 bg-black/30 px-2.5',
  'text-[13px] text-white/85 outline-none transition-colors',
  'placeholder:text-white/22 focus:border-[var(--color-ember-500)]/60',
].join(' ')

export const MONO_FIELD_CLASS = `h-9 ${FIELD_BASE} font-[family-name:var(--font-mono)] text-[12px]`

export const TEXTAREA_CLASS = [
  FIELD_BASE,
  'rh-scroll resize-y py-2 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed',
].join(' ')

const BUTTON_BASE = [
  'flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3.5',
  'text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
].join(' ')

export const PRIMARY_BUTTON = [
  BUTTON_BASE,
  'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]',
  'hover:border-[var(--color-ember-500)]/70 hover:bg-[var(--color-ember-500)]/25',
].join(' ')

export const GHOST_BUTTON = [
  BUTTON_BASE,
  'border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:text-white',
].join(' ')

export const DANGER_BUTTON = [
  BUTTON_BASE,
  'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/12 text-[var(--color-danger)]',
  'hover:border-[var(--color-danger)]/70 hover:bg-[var(--color-danger)]/20',
].join(' ')

export const CHECKBOX_CLASS = 'h-3.5 w-3.5 accent-[var(--color-ember-500)]'
