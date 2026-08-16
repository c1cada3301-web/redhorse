import { useState } from 'react'
import { formatDistanceStrict } from 'date-fns'
import { ru } from 'date-fns/locale/ru'
import { Trash2 } from 'lucide-react'
import type { ApiImage } from '../../api/types'
import { formatBytes, shortId } from '../../lib/format'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconButton } from '../ui/IconButton'

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
  const [confirming, setConfirming] = useState(false)

  const [primaryTag, ...restTags] = image.tags
  const used = image.containers > 0

  return (
    <div
      className={`${IMAGE_GRID} rounded-xl border border-white/6 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/12 hover:bg-white/[0.035]`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {primaryTag === undefined ? (
            <span className="truncate font-[family-name:var(--font-mono)] text-[13px] text-white/35">
              &lt;без тега&gt;
            </span>
          ) : (
            <span className="truncate font-[family-name:var(--font-mono)] text-[13px] font-medium text-white">
              {primaryTag}
            </span>
          )}

          {restTags.length > 0 && (
            <span
              title={restTags.join(', ')}
              className="shrink-0 rounded bg-white/8 px-1 text-[10px] text-white/45"
            >
              +{restTags.length}
            </span>
          )}

          {image.dangling && (
            <span className="shrink-0 rounded bg-[var(--color-amber-ok)]/12 px-1 text-[9px] text-[var(--color-amber-ok)]">
              без тега
            </span>
          )}
        </div>

        <div className="mt-0.5 truncate font-[family-name:var(--font-mono)] text-[11px] text-white/35">
          {imageShortId(image.id)}
        </div>
      </div>

      <div className="font-[family-name:var(--font-mono)] text-[11px] text-white/55">
        {formatBytes(image.size)}
      </div>

      <div className="font-[family-name:var(--font-mono)] text-[11px]">
        <span className={used ? 'text-[var(--color-mint-400)]' : 'text-white/30'}>
          {used ? image.containers : '—'}
        </span>
      </div>

      <div className="truncate text-[11px] text-white/40">{formatCreated(image.createdAt)}</div>

      <div className="flex items-center justify-end">
        <IconButton label="Удалить образ" tone="danger" onClick={() => setConfirming(true)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Удалить образ?"
        description={
          used
            ? 'Образ занят контейнерами — Docker откажет, и мы предложим удалить принудительно.'
            : 'Образ и его неиспользуемые слои будут удалены. Действие необратимо.'
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
