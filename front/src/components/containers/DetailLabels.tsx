import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Tags } from 'lucide-react'
import { CopyButton, DetailPanel, EMPTY_MARK, EmptyNote, plural } from './DetailPrimitives'

export function DetailLabels({ labels }: { labels: Record<string, string> }) {
  const [open, setOpen] = useState(false)

  const entries = useMemo(
    () => Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)),
    [labels],
  )

  return (
    <DetailPanel
      title="Метки"
      icon={<Tags className="h-4 w-4" />}
      hint={`${entries.length} ${plural(entries.length, ['метка', 'метки', 'меток'])}`}
      right={
        entries.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-fg/10 bg-fg/5 px-2 text-[11px] text-fg/55 transition-colors hover:text-fg"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {open ? 'Свернуть' : 'Показать'}
          </button>
        ) : undefined
      }
    >
      {entries.length === 0 ? (
        <EmptyNote text="Меток нет" />
      ) : open ? (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border border-fg/6 bg-fg/[0.015] px-3 py-1.5"
            >
              <span
                title={key}
                className="w-[280px] shrink-0 truncate font-[family-name:var(--font-mono)] text-[11px] text-fg/50"
              >
                {key}
              </span>
              <span
                title={value}
                className={`min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-[11px] ${
                  value === '' ? 'text-fg/25' : 'text-fg/80'
                }`}
              >
                {value === '' ? EMPTY_MARK : value}
              </span>
              {value !== '' && <CopyButton value={value} label="Скопировать значение" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-fg/30">
          Скрыто, чтобы не мешать: у compose-контейнеров меток обычно десяток.
        </div>
      )}
    </DetailPanel>
  )
}
