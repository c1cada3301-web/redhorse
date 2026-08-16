import { useCallback, useRef, useState } from 'react'
import type { Toast } from '../components/ui/Toasts'

export interface ToastsApi {
  items: Toast[]
  push: (text: string, tone?: Toast['tone']) => void
  pushError: (error: unknown, fallback: string) => void
  dismiss: (id: number) => void
}

export function useToasts(): ToastsApi {
  const [items, setItems] = useState<Toast[]>([])
  const nextId = useRef(1)

  const push = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = nextId.current++
    setItems((prev) => [...prev, { id, text, tone }])
  }, [])

  const pushError = useCallback(
    (error: unknown, fallback: string) => {
      const detail = error instanceof Error ? error.message : String(error ?? '')
      push(detail.trim() === '' ? fallback : `${fallback}: ${detail}`, 'error')
    },
    [push],
  )

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return { items, push, pushError, dismiss }
}
