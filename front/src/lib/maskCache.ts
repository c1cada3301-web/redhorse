import type { LogLine } from '../types'
import { maskText } from './mask'

/**
 * Замаскированный текст строки, посчитанный один раз.
 *
 * Маскирование нужно и при фильтрации (искать надо по тому, что видно), и при
 * отрисовке. Прогонять регулярки по 20000 строк на каждый рендер нельзя, а
 * строки иммутабельны — поэтому результат живёт в WeakMap и уходит вместе со
 * строкой, когда та вытесняется из кольцевого буфера.
 */
const cache = new WeakMap<LogLine, string>()

export function maskedText(line: LogLine): string {
  const cached = cache.get(line)
  if (cached !== undefined) return cached

  const masked = maskText(line.text)
  cache.set(line, masked)

  return masked
}

/** Текст строки с учётом режима: под маской или как есть. */
export function visibleText(line: LogLine, masked: boolean): string {
  return masked ? maskedText(line) : line.text
}
