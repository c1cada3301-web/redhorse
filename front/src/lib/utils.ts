import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Склейка классов с разрешением конфликтов Tailwind.
 *
 * Без неё «базовый класс компонента + класс с места вызова» дают два
 * конкурирующих правила, и побеждает то, что стоит позже в собранном CSS,
 * а не то, что написано у вызывающего. twMerge оставляет последнее.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
