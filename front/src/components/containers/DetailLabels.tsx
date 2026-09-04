import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Tags } from 'lucide-react'
import { CopyButton, DetailPanel, EMPTY_MARK, EmptyNote, plural } from './DetailPrimitives'
import { useT } from '@/state/settings'

export function DetailLabels({ labels }: { labels: Record<string, string> }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  const entries = useMemo(
    () => Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)),
    [labels],
  )

  return (
    <DetailPanel
      title={t('detail.labels')}
      icon={<Tags className="h-4 w-4" />}
      hint={`${entries.length} ${plural(entries.length, ['метка', 'метки', 'меток'])}`}
      right={
        entries.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-fg/5 px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {open ? t('detail.collapse') : t('detail.show')}
          </button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <EmptyNote text={t('detail.noLabels')} />
      ) : open ? (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-md bg-foreground/3 px-3 py-1.5"
            >
              <span
                title={key}
                className="w-[280px] shrink-0 truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground"
              >
                {key}
              </span>
              <span
                title={value}
                className={`min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-xs ${
                  value === '' ? 'text-muted-foreground' : 'text-foreground/90'
                }`}
              >
                {value === '' ? EMPTY_MARK : value}
              </span>
              {value !== '' && <CopyButton value={value} label={t('detail.copyValue')} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Скрыто, чтобы не мешать: у compose-контейнеров меток обычно десяток.
        </div>
      )}
    </DetailPanel>
  )
}
