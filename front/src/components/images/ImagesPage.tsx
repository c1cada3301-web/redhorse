import { useMemo, useState } from 'react'
import { Boxes, Download, Hammer, Trash2, X } from 'lucide-react'
import { useImagesQuery, usePruneImages, useRemoveImage } from '../../api/queries'
import type { ApiImage } from '../../api/types'
import { formatBytes } from '../../lib/format'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { BuildDialog } from './BuildDialog'
import { IMAGE_GRID, ImageRow, imageLabel } from './ImageRow'
import { PullDialog } from './PullDialog'
import { errorText, isConflict } from './errorText'
import { DANGER_BUTTON, GHOST_BUTTON, PRIMARY_BUTTON } from './styles'
import { useT } from '@/state/settings'

type Filter = 'all' | 'used' | 'dangling'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'common.all' },
  { key: 'used', label: 'images.filter.used' },
  { key: 'dangling', label: 'images.filter.untagged' },
]

const COLUMNS = ['images.col.image', 'images.col.size', 'images.col.containers', 'images.col.created', '']

interface Notice {
  tone: 'ok' | 'error'
  text: string
}

interface ImagesPageProps {
  search: string
}

function matches(image: ApiImage, needle: string): boolean {
  if (needle === '') return true

  return [...image.tags, image.id].join(' ').toLowerCase().includes(needle.toLowerCase())
}

function inFilter(image: ApiImage, filter: Filter): boolean {
  if (filter === 'used') return image.containers > 0
  if (filter === 'dangling') return image.dangling

  return true
}

export function ImagesPage({ search }: ImagesPageProps) {
  const t = useT()
  const query = useImagesQuery()
  const removeImage = useRemoveImage()
  const pruneImages = usePruneImages()

  const [filter, setFilter] = useState<Filter>('all')
  const [buildOpen, setBuildOpen] = useState(false)
  const [pullOpen, setPullOpen] = useState(false)
  const [pruneOpen, setPruneOpen] = useState(false)
  /** Образ, который Docker отказался удалять — предлагаем повтор с force. */
  const [conflicting, setConflicting] = useState<ApiImage | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const images = useMemo(() => query.data ?? [], [query.data])

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      all: images.length,
      used: images.filter((image) => image.containers > 0).length,
      dangling: images.filter((image) => image.dangling).length,
    }),
    [images],
  )

  const visible = useMemo(
    () =>
      images
        .filter((image) => inFilter(image, filter) && matches(image, search))
        .toSorted((left, right) => right.createdAt - left.createdAt),
    [images, filter, search],
  )

  const totalSize = images.reduce((sum, image) => sum + image.size, 0)

  const handleRemove = (image: ApiImage, force: boolean) => {
    setNotice(null)

    removeImage.mutate(
      { id: image.id, force },
      {
        onSuccess: () => setNotice({ tone: 'ok', text: `образ ${imageLabel(image)} удалён` }),
        onError: (error: unknown) => {
          // 409 — образ занят контейнером, помогает только принудительное удаление.
          if (!force && isConflict(error)) {
            setConflicting(image)
            return
          }

          setNotice({ tone: 'error', text: errorText(error) })
        },
      },
    )
  }

  const handlePrune = () => {
    setNotice(null)

    pruneImages.mutate(true, {
      onSuccess: (result) =>
        setNotice({
          tone: 'ok',
          text: `удалено ${result.deleted}, освобождено ${formatBytes(result.reclaimed)}`,
        }),
      onError: (error: unknown) => setNotice({ tone: 'error', text: errorText(error) }),
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-4">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={[
              'flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
              filter === item.key
                ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
                : 'border-border bg-fg/[0.02] text-muted-foreground hover:text-foreground/90',
            ].join(' ')}
          >
            {t(item.label)}
            <span className="rounded bg-bg/30 px-1 font-[family-name:var(--font-mono)] text-2xs text-muted-foreground">
              {counts[item.key]}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {notice === null ? (
            <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
              {t('containers.diskTotal', { size: formatBytes(totalSize) })}
            </span>
          ) : (
            <NoticeLine notice={notice} onDismiss={() => setNotice(null)} />
          )}

          <button type="button" onClick={() => setBuildOpen(true)} className={PRIMARY_BUTTON}>
            <Hammer className="h-3.5 w-3.5" />
            {t('images.build')}
          </button>

          <button type="button" onClick={() => setPullOpen(true)} className={GHOST_BUTTON}>
            <Download className="h-3.5 w-3.5" />
            {t('images.pull')}
          </button>

          <button type="button" onClick={() => setPruneOpen(true)} className={DANGER_BUTTON}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('images.pruneUnused')}
          </button>
        </div>
      </div>

      <div className={`${IMAGE_GRID} shrink-0 px-7 pt-4 pb-2`}>
        {COLUMNS.map((column, index) => (
          <div
            key={column === '' ? `col-${index}` : column}
            className="text-2xs tracking-wider text-muted-foreground uppercase"
          >
            {column === '' ? '' : t(column)}
          </div>
        ))}
      </div>

      <div className="rh-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <ImagesBody
          loading={query.isLoading}
          error={query.error}
          visible={visible}
          onRemove={(image) => handleRemove(image, false)}
        />
      </div>

      <BuildDialog open={buildOpen} onOpenChange={setBuildOpen} />
      <PullDialog open={pullOpen} onOpenChange={setPullOpen} />

      <ConfirmDialog
        open={conflicting !== null}
        onOpenChange={(next) => {
          if (!next) setConflicting(null)
        }}
        title={t('images.busy.title')}
        description="Docker отказал: образ используется контейнерами. Принудительное удаление снимет все его теги."
        subject={conflicting === null ? undefined : imageLabel(conflicting)}
        confirmLabel={t('images.busy.force')}
        onConfirm={() => {
          if (conflicting === null) return
          handleRemove(conflicting, true)
        }}
      />

      <ConfirmDialog
        open={pruneOpen}
        onOpenChange={setPruneOpen}
        title={t('images.prune.title')}
        description={t('images.prune.text')}
        confirmLabel="Очистить"
        onConfirm={handlePrune}
      />
    </div>
  )
}

interface NoticeLineProps {
  notice: Notice
  onDismiss: () => void
}

function NoticeLine({ notice, onDismiss }: NoticeLineProps) {
  return (
    <span
      className={[
        'flex max-w-[420px] items-center gap-1.5 rounded-lg border px-2 py-1',
        'font-[family-name:var(--font-mono)] text-xs',
        notice.tone === 'ok'
          ? 'border-[var(--color-mint-400)]/30 bg-[var(--color-mint-400)]/10 text-[var(--color-mint-400)]'
          : 'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
      ].join(' ')}
    >
      <span className="truncate">{notice.text}</span>
      <button type="button" onClick={onDismiss} aria-label="Скрыть" className="opacity-60 hover:opacity-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

interface ImagesBodyProps {
  loading: boolean
  error: Error | null
  visible: ApiImage[]
  onRemove: (image: ApiImage) => void
}

function ImagesBody({ loading, error, visible, onRemove }: ImagesBodyProps) {
  const t = useT()
  if (loading) {
    return <p className="px-3 pt-6 text-sm text-muted-foreground">{t('images.loading')}</p>
  }

  if (error !== null) {
    return (
      <p className="px-3 pt-6 text-sm text-[var(--color-danger)]">
        Не удалось получить образы: {errorText(error)}
      </p>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Boxes className="h-6 w-6" />
        <p className="text-sm">Ничего не найдено</p>
      </div>
    )
  }

  return (
    <>
      {visible.map((image) => (
        <ImageRow key={image.id} image={image} onRemove={() => onRemove(image)} />
      ))}
    </>
  )
}
