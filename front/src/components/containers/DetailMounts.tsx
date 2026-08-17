import { ArrowRight, HardDrive } from 'lucide-react'
import type { MountPoint } from '../../api/types'
import { CopyButton, Chip, DetailPanel, EMPTY_MARK, EmptyNote, plural } from './DetailPrimitives'

const TYPE_LABEL: Record<string, string> = {
  bind: 'папка хоста',
  volume: 'том',
  tmpfs: 'память',
  npipe: 'канал',
}

export function DetailMounts({ mounts }: { mounts: MountPoint[] }) {
  return (
    <DetailPanel
      title="Монтирования"
      icon={<HardDrive className="h-4 w-4" />}
      hint={`${mounts.length} ${plural(mounts.length, ['точка', 'точки', 'точек'])}`}
    >
      {mounts.length === 0 ? (
        <EmptyNote text="Ничего не смонтировано" />
      ) : (
        <div className="space-y-1">
          {mounts.map((mount) => (
            <div
              key={`${mount.destination}-${mount.source}`}
              className="rounded-lg border border-white/6 bg-white/[0.015] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Chip tone={mount.type === 'bind' ? 'warn' : 'sky'}>
                  {TYPE_LABEL[mount.type] ?? (mount.type === '' ? EMPTY_MARK : mount.type)}
                </Chip>
                <Chip tone={mount.rw ? 'ok' : 'muted'}>{mount.rw ? 'rw' : 'ro'}</Chip>
                {mount.mode !== '' && mount.mode !== (mount.rw ? 'rw' : 'ro') && (
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/25">
                    {mount.mode}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span
                  title={mount.source}
                  className="min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-[11px] text-white/55"
                >
                  {mount.source === '' ? EMPTY_MARK : mount.source}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-white/20" />
                <span
                  title={mount.destination}
                  className="min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-[11px] text-white/85"
                >
                  {mount.destination}
                </span>
                <CopyButton value={mount.source} label="Скопировать источник" />
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailPanel>
  )
}
