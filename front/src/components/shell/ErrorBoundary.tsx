import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Последний рубеж: любая ошибка рендера иначе оставляет пустую страницу.
 * Docker присылает состояния, о которых интерфейс может не знать, — такое
 * должно деградировать в сообщение, а не в белый экран.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Ошибка рендера RedHorse:', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state

    if (error === null) return this.props.children

    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-ink-950)] p-6">
        <div className="rh-panel w-full max-w-lg p-5">
          <div className="flex items-center gap-2 text-[var(--color-danger)]">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-[15px] font-medium text-fg">Интерфейс упал</h1>
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-fg/50">
            Данные с Docker Engine продолжают работать — сломался только рендер. Подробности
            в консоли браузера.
          </p>

          <pre className="rh-scroll mt-3 max-h-48 overflow-auto rounded-lg border border-fg/8 bg-bg/30 p-3 font-[family-name:var(--font-mono)] text-[11px] text-fg/60">
            {error.message}
          </pre>

          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 flex h-8 items-center gap-2 rounded-lg border border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 px-3 text-[12px] text-[var(--color-ember-300)] transition-colors hover:bg-[var(--color-ember-500)]/25"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }
}
