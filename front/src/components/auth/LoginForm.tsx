import { useState, type FormEvent } from 'react'
import { Loader2, LockKeyhole, ShieldPlus } from 'lucide-react'
import { bootstrap, login, type Account } from '../../api/auth'
import { ApiError } from '../../api/client'

const MIN_PASSWORD = 8

interface LoginFormProps {
  /** setup — в базе ещё нет пользователей, создаём первого администратора. */
  mode: 'login' | 'setup'
  onSuccess: (account: Account) => void
}

export function LoginForm({ mode, onSuccess }: LoginFormProps) {
  const setup = mode === 'setup'
  const [username, setUsername] = useState(setup ? 'admin' : '')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (setup) {
      if (password.length < MIN_PASSWORD) {
        setError(`Пароль должен быть не короче ${MIN_PASSWORD} символов`)
        return
      }
      if (password !== repeat) {
        setError('Пароли не совпадают')
        return
      }
    }

    setBusy(true)
    try {
      const account = setup ? await bootstrap(username, password) : await login(username, password)
      onSuccess(account)
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Сервер недоступен. Проверь, что API и база запущены.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-fg/10 bg-ink-900 p-7 shadow-2xl shadow-black/40"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-ember-500/12 text-ember-400">
            {setup ? <ShieldPlus size={19} /> : <LockKeyhole size={19} />}
          </span>
          <div className="min-w-0">
            <div className="text-base font-semibold tracking-tight text-fg">
              {setup ? 'Первый вход' : 'Dala'}
            </div>
            <div className="truncate text-xs text-fg/45">
              {setup ? 'Создай администратора панели' : 'Войди, чтобы управлять Docker'}
            </div>
          </div>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-medium text-fg/55">Логин</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus={!setup}
            required
            className="w-full rounded-lg border border-fg/12 bg-fg/[0.03] px-3 py-2 text-sm text-body outline-none transition focus:border-ember-500/60 focus:bg-fg/[0.05]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-fg/55">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={setup ? 'new-password' : 'current-password'}
            required
            className="w-full rounded-lg border border-fg/12 bg-fg/[0.03] px-3 py-2 text-sm text-body outline-none transition focus:border-ember-500/60 focus:bg-fg/[0.05]"
          />
        </label>

        {setup && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-fg/55">Пароль ещё раз</span>
            <input
              type="password"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-fg/12 bg-fg/[0.03] px-3 py-2 text-sm text-body outline-none transition focus:border-ember-500/60 focus:bg-fg/[0.05]"
            />
          </label>
        )}

        {error !== null && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-ember-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ember-400 disabled:opacity-50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {setup ? 'Создать и войти' : 'Войти'}
        </button>

        {setup && (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-fg/35">
            Учётная запись хранится в Postgres. Доступ к панели равен доступу к Docker-хосту —
            пароль выбирай соответственно.
          </p>
        )}
      </form>
    </div>
  )
}
