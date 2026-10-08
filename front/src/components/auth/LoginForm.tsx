import { useState, type FormEvent } from 'react'
import { Loader2, LockKeyhole, ShieldPlus } from 'lucide-react'
import { bootstrap, login, type Account } from '@/api/auth'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/state/settings'

const MIN_PASSWORD = 8

interface LoginFormProps {
  /** setup — в базе ещё нет пользователей, создаём первого администратора. */
  mode: 'login' | 'setup'
  /** Окно первичной настройки истекло: создать администратора можно только после перезапуска. */
  setupClosed?: boolean
  onSuccess: (account: Account) => void
}

export function LoginForm({ mode, setupClosed = false, onSuccess }: LoginFormProps) {
  const t = useT()
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
        setError(t('auth.error.short', { count: MIN_PASSWORD }))
        return
      }
      if (password !== repeat) {
        setError(t('auth.error.mismatch'))
        return
      }
    }

    setBusy(true)
    try {
      const account = setup ? await bootstrap(username, password) : await login(username, password)
      onSuccess(account)
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : t('auth.error.offline'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-2xl shadow-black/30">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
              {setup ? <ShieldPlus className="size-5" /> : <LockKeyhole className="size-5" />}
            </span>
            <div className="min-w-0">
              <div className="text-xl font-semibold tracking-tight text-foreground">
                {setup ? t('auth.setup.title') : 'RedHorse'}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {setup ? t('auth.setup.subtitle') : t('auth.login.title')}
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus={!setup}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={setup ? 'new-password' : 'current-password'}
                required
              />
            </div>

            {setup && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="repeat">{t('auth.passwordRepeat')}</Label>
                <Input
                  id="repeat"
                  type="password"
                  value={repeat}
                  onChange={(event) => setRepeat(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {setupClosed && (
              <p role="alert" className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                {t('auth.setup.closed')}
              </p>
            )}

            {error !== null && (
              <p role="alert" className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={busy || setupClosed} className="mt-1 w-full">
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {setup ? t('auth.submitSetup') : t('auth.submit')}
            </Button>
          </form>

          {setup && (
            <p className="mt-4 text-center text-2xs leading-relaxed text-muted-foreground">
              {t('auth.setup.note')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
