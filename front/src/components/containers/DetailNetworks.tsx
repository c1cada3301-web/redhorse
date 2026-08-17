import { Network } from 'lucide-react'
import type { NetworkAttachment } from '../../api/types'
import { Chip, CopyButton, DetailPanel, EMPTY_MARK, EmptyNote, plural } from './DetailPrimitives'

export function DetailNetworks({ networks }: { networks: NetworkAttachment[] }) {
  return (
    <DetailPanel
      title="Сети"
      icon={<Network className="h-4 w-4" />}
      hint={`${networks.length} ${plural(networks.length, ['подключение', 'подключения', 'подключений'])}`}
    >
      {networks.length === 0 ? (
        <EmptyNote text="Контейнер не подключён к сетям" />
      ) : (
        <div className="space-y-1">
          {networks.map((net) => (
            <div key={net.name} className="rounded-lg border border-fg/6 bg-fg/[0.015] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[12px] text-fg/85" title={net.name}>
                  {net.name}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-sky-400)]">
                  {net.ipAddress === '' ? EMPTY_MARK : net.ipAddress}
                </span>
                {net.ipAddress !== '' && <CopyButton value={net.ipAddress} label="Скопировать IP" />}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-mono)] text-[10px] text-fg/35">
                <span>шлюз {net.gateway === '' ? EMPTY_MARK : net.gateway}</span>
                <span>mac {net.macAddress === '' ? EMPTY_MARK : net.macAddress}</span>
              </div>

              {net.aliases.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {net.aliases.map((alias) => (
                    <Chip key={alias} tone="accent">
                      {alias}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DetailPanel>
  )
}
