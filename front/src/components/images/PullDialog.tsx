import { useState } from 'react'
import { Download, RotateCw } from 'lucide-react'
import { usePullImage } from '../../api/queries'
import { useJobStream } from '../../state/useJobStream'
import { DialogShell } from './DialogShell'
import { JobConsole } from './JobConsole'
import { errorText } from './errorText'
import { GHOST_BUTTON, LABEL_CLASS, MONO_FIELD_CLASS, PRIMARY_BUTTON } from './styles'
import { useT } from '@/state/settings'

interface PullDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PullDialog({ open, onOpenChange }: PullDialogProps) {
  const t = useT()
  const [repository, setRepository] = useState('')
  const [tag, setTag] = useState('latest')
  const [jobId, setJobId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const pull = usePullImage()
  const stream = useJobStream(jobId)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setJobId(null)
      setFormError(null)
      pull.reset()
    }

    onOpenChange(next)
  }

  const handlePull = () => {
    const trimmedRepository = repository.trim()

    if (trimmedRepository === '') {
      setFormError(t('pull.repoPlaceholder'))
      return
    }

    setFormError(null)

    const trimmedTag = tag.trim()

    pull.mutate(
      { repository: trimmedRepository, tag: trimmedTag === '' ? 'latest' : trimmedTag },
      {
        onSuccess: (job) => setJobId(job.id),
        onError: (error: unknown) => setFormError(errorText(error)),
      },
    )
  }

  const running = jobId !== null && stream.state === 'running'

  return (
    <DialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={t('pull.title')}
      description={jobId === null ? 'docker pull с настроенного реестра' : `${repository.trim()}:${tag.trim()}`}
      width="640px"
      footer={
        jobId === null ? (
          <>
            <button type="button" onClick={() => handleOpenChange(false)} className={GHOST_BUTTON}>
              Отмена
            </button>
            <button
              type="button"
              onClick={handlePull}
              disabled={pull.isPending}
              className={PRIMARY_BUTTON}
            >
              <Download className="h-3.5 w-3.5" />
              {pull.isPending ? t('pull.starting') : t('pull.submit')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setJobId(null)}
              disabled={running}
              className={GHOST_BUTTON}
            >
              <RotateCw className="h-3.5 w-3.5" />
              Загрузить другой
            </button>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className={running ? GHOST_BUTTON : PRIMARY_BUTTON}
            >
              Закрыть
            </button>
          </>
        )
      }
    >
      {jobId === null ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="pull-repository" className={LABEL_CLASS}>
              Репозиторий
            </label>
            <input
              id="pull-repository"
              value={repository}
              onChange={(event) => setRepository(event.target.value)}
              placeholder="alpine"
              spellCheck={false}
              autoComplete="off"
              className={MONO_FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="pull-tag" className={LABEL_CLASS}>
              Тег
            </label>
            <input
              id="pull-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="latest"
              spellCheck={false}
              autoComplete="off"
              className={MONO_FIELD_CLASS}
            />
          </div>

          {formError !== null && (
            <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
              {formError}
            </p>
          )}
        </div>
      ) : (
        <JobConsole stream={stream} runningLabel={t('pull.running')} height="38vh" />
      )}
    </DialogShell>
  )
}
