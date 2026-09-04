import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight, Hammer, RotateCw } from 'lucide-react'
import { useBuildImage } from '../../api/queries'
import type { BuildRequest } from '../../api/types'
import { useJobStream } from '../../state/useJobStream'
import { DialogShell } from './DialogShell'
import { JobConsole } from './JobConsole'
import { KeyValueEditor, toRecord } from './KeyValueEditor'
import type { Pair } from './KeyValueEditor'
import { errorText } from './errorText'
import {
  CHECKBOX_CLASS,
  GHOST_BUTTON,
  LABEL_CLASS,
  MONO_FIELD_CLASS,
  PRIMARY_BUTTON,
  TEXTAREA_CLASS,
} from './styles'
import { useT } from '@/state/settings'

const DOCKERFILE_PLACEHOLDER = `FROM alpine:3.20

RUN apk add --no-cache sing-box
COPY config.json /etc/sing-box/config.json

ENTRYPOINT ["sing-box", "run", "-c", "/etc/sing-box/config.json"]`

interface BuildDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BuildDialog({ open, onOpenChange }: BuildDialogProps) {
  const t = useT()
  const [tag, setTag] = useState('')
  const [dockerfile, setDockerfile] = useState('')
  const [buildArgs, setBuildArgs] = useState<Pair[]>([])
  const [files, setFiles] = useState<Pair[]>([])
  const [noCache, setNoCache] = useState(false)
  const [pull, setPull] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const build = useBuildImage()
  const stream = useJobStream(jobId)

  const handleOpenChange = (next: boolean) => {
    // Закрытие не отменяет сборку на сервере, но диалог возвращаем к форме.
    if (!next) {
      setJobId(null)
      setFormError(null)
      build.reset()
    }

    onOpenChange(next)
  }

  const handleBuild = () => {
    const trimmedTag = tag.trim()

    if (trimmedTag === '') {
      setFormError(t('build.tagPlaceholder'))
      return
    }

    if (dockerfile.trim() === '') {
      setFormError('Dockerfile не может быть пустым')
      return
    }

    setFormError(null)

    const request: BuildRequest = {
      tag: trimmedTag,
      dockerfile,
      files: toRecord(files),
      buildArgs: toRecord(buildArgs),
      noCache,
      pull,
    }

    build.mutate(request, {
      onSuccess: (job) => setJobId(job.id),
      onError: (error: unknown) => setFormError(errorText(error)),
    })
  }

  const running = jobId !== null && stream.state === 'running'

  return (
    <DialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={t('build.title')}
      description={
        jobId === null
          ? 'Dockerfile и файлы контекста уходят на сервер, сборка идёт на хосте Docker'
          : `Тег ${tag.trim()}`
      }
      width="760px"
      footer={
        jobId === null ? (
          <>
            <button type="button" onClick={() => handleOpenChange(false)} className={GHOST_BUTTON}>
              Отмена
            </button>
            <button
              type="button"
              onClick={handleBuild}
              disabled={build.isPending}
              className={PRIMARY_BUTTON}
            >
              <Hammer className="h-3.5 w-3.5" />
              {build.isPending ? t('build.starting') : t('build.submit')}
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
              Собрать ещё раз
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
            <label htmlFor="build-tag" className={LABEL_CLASS}>
              Тег
            </label>
            <input
              id="build-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="sing-box:latest"
              spellCheck={false}
              autoComplete="off"
              className={MONO_FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="build-dockerfile" className={LABEL_CLASS}>
              Dockerfile
            </label>
            <textarea
              id="build-dockerfile"
              value={dockerfile}
              onChange={(event) => setDockerfile(event.target.value)}
              placeholder={DOCKERFILE_PLACEHOLDER}
              spellCheck={false}
              rows={12}
              className={TEXTAREA_CLASS}
            />
          </div>

          <Section title={t('build.advanced')} open={advanced} onToggle={() => setAdvanced(!advanced)}>
            <div className="space-y-4 pt-1">
              <div>
                <span className={LABEL_CLASS}>Build-args</span>
                <KeyValueEditor
                  rows={buildArgs}
                  keyPlaceholder="VERSION"
                  valuePlaceholder="1.10.0"
                  addLabel={t('build.addArg')}
                  onChange={setBuildArgs}
                />
              </div>

              <div className="flex flex-wrap items-center gap-5">
                <Checkbox
                  id="build-no-cache"
                  label={t('build.noCache')}
                  checked={noCache}
                  onChange={setNoCache}
                />
                <Checkbox
                  id="build-pull"
                  label={t('build.pullBase')}
                  checked={pull}
                  onChange={setPull}
                />
              </div>
            </div>
          </Section>

          <div>
            <span className={LABEL_CLASS}>{t('build.contextFiles')}</span>
            <p className="mb-2 text-xs text-muted-foreground">
              Путь внутри контекста и содержимое — для инструкций COPY в Dockerfile.
            </p>
            <KeyValueEditor
              rows={files}
              keyPlaceholder="config.json"
              valuePlaceholder={t('build.fileContent')}
              addLabel={t('build.addFile')}
              multiline
              onChange={setFiles}
            />
          </div>

          {formError !== null && (
            <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
              {formError}
            </p>
          )}
        </div>
      ) : (
        <JobConsole stream={stream} runningLabel={t('build.running')} />
      )}
    </DialogShell>
  )
}

interface SectionProps {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function Section({ title, open, onToggle, children }: SectionProps) {
  return (
    <div className="rounded-md bg-foreground/3 px-3 py-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-sm text-foreground/75 transition-colors hover:text-foreground"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        {title}
      </button>

      {open && children}
    </div>
  )
}

interface CheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Checkbox({ id, label, checked, onChange }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground/75">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={CHECKBOX_CLASS}
      />
      {label}
    </label>
  )
}
