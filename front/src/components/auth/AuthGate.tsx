import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { LoginForm } from './LoginForm'
import { UNAUTHORIZED_EVENT } from '../../api/client'
import { fetchAuthState, fetchMe, type Account } from '../../api/auth'

type Phase = 'checking' | 'setup' | 'login' | 'ready'

interface AuthGateProps {
  children: (account: Account, signOut: () => void) => ReactNode
}

/**
 * Решает, что показать до основного приложения: экран создания первого
 * администратора, форму входа или саму панель.
 *
 * Панель управляет Docker-сокетом, поэтому ни один её экран не рендерится,
 * пока сервер не подтвердил сессию.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [account, setAccount] = useState<Account | null>(null)

  const probe = useCallback(async () => {
    try {
      const me = await fetchMe()
      setAccount(me)
      setPhase('ready')
      return
    } catch {
      // 401 — просто ещё не вошли; ниже выясняем, есть ли вообще учётные записи.
    }

    try {
      const state = await fetchAuthState()
      setPhase(state.initialized ? 'login' : 'setup')
    } catch {
      // База недоступна — показываем вход: там будет видна ошибка сервера.
      setPhase('login')
    }
  }, [])

  useEffect(() => {
    void probe()
  }, [probe])

  useEffect(() => {
    const onUnauthorized = () => {
      setAccount(null)
      setPhase((current) => (current === 'setup' ? current : 'login'))
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const signOut = useCallback(() => {
    setAccount(null)
    setPhase('login')
  }, [])

  if (phase === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-sm text-fg/40">
        Проверяем сессию…
      </div>
    )
  }

  if (phase === 'ready' && account !== null) {
    return <>{children(account, signOut)}</>
  }

  return (
    <LoginForm
      mode={phase === 'setup' ? 'setup' : 'login'}
      onSuccess={(me) => {
        setAccount(me)
        setPhase('ready')
      }}
    />
  )
}
