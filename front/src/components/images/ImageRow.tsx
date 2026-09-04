import { useState } from 'react'
import { formatDistanceStrict } from 'date-fns'
import { ru } from 'date-fns/locale/ru'
import { Trash2 } from 'lucide-react'
import type { ApiImage } from '../../api/types'
import { formatBytes, shortId } from '../../lib/format'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconButton } from '../ui/IconButton'
import { useT } from '@/state/settings'

export const IMAGE_GRID = 'grid grid-cols-[minmax(240px,2.6fr)_100px_128px_150px_60px] items-center gap-3'

/** Docker отдаёт id с префиксом алгоритма — в интерфейсе он только мешает. */
export function imageShortId(id: string): string {
  return shortId(id.startsWith('sha256:') ? id.slice(7) : id)
}

/** Как назвать образ в подтверждениях: первый тег, иначе короткий id. */
export function imageLabel(image: ApiImage): string {
  return image.tags[0] ?? imageShortId(image.id)
}

interface ImageRowProps {
  image: ApiImage
  onRemove: () => void
}

export function ImageRow({ image, onRemove }: ImageRowProps) {
  const t = useT()
  const [confirming, setConfirming] = useState(false)

  const [primaryTag, ...restTags] = image.tags
  const used = image.containers > 0

  return (
    <div
      className={`${IMAGE_GRID} border-b border-border px-3 py-2.5 transition-colors hover:bg-foreground/4`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {primaryTag === undefined ? (
            <span className="truncate font-[family-name:var(--font-mono)] text-base text-muted-foreground">
              &lt;без тега&gt;
            </span>
          ) : (
            <span className="truncate font-[family-name:var(--font-mono)] text-base font-medium text-foreground">
              {primaryTag}
            </span>
          )}

          {restTags.length > 0 && (
            <span
              title={restTags.join(', ')}
              className="shrink-0 rounded bg-fg/8 px-1 text-2xs text-muted-foreground"
            >
              +{restTags.length}
            </span>
          )}

          {image.dangling && (
            <span className="shrink-0 rounded bg-[var(--color-amber-ok)]/12 px-1 text-2xs text-[var(--color-amber-ok)]">
              {t('images.untagged')}
            </span>
          )}
        </div>

        <div className="mt-0.5 truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          {imageShortId(image.id)}
        </div>
      </div>

      <div className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
        {formatBytes(image.size)}
      </div>

      <div className="font-[family-name:var(--font-mono)] text-xs">
        <span className={used ? 'text-[var(--color-mint-400)]' : 'text-muted-foreground'}>
          {used ? image.containers : '—'}
        </span>
      </div>

      <div className="truncate text-xs text-muted-foreground">{formatCreated(image.createdAt)}</div>

      <div className="flex items-center justify-end">
        <IconButton label={t('images.remove')} tone="danger" onClick={() => setConfirming(true)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('images.remove.title')}
        description={
          used
            ? t('images.remove.textUsed')
            : t('images.remove.text')
        }
        subject={imageLabel(image)}
        onConfirm={onRemove}
      />
    </div>
  )
}

function formatCreated(createdAt: number): string {
  if (!Number.isFinite(createdAt) || createdAt <= 0) return '—'

  return formatDistanceStrict(createdAt, Date.now(), { locale: ru, addSuffix: true })
}
