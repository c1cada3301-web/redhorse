import { Network } from 'lucide-react'
import type { NetworkAttachment } from '../../api/types'
import { Chip, CopyButton, DetailPanel, EMPTY_MARK, EmptyNote, plural } from './DetailPrimitives'
import { useT } from '@/state/settings'

export function DetailNetworks({ networks }: { networks: NetworkAttachment[] }) {
  const t = useT()
  return (
    <DetailPanel
      title={t('detail.networks')}
      icon={<Network className="h-4 w-4" />}
      hint={`${networks.length} ${plural(networks.length, ['подключение', 'подключения', 'подключений'])}`}
    >
      {networks.length === 0 ? (
        <EmptyNote text={t('detail.noNetworks')} />
      ) : (
        <div className="space-y-1">
          {networks.map((net) => (
            <div key={net.name} className="rounded-md bg-foreground/3 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground/90" title={net.name}>
                  {net.name}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-sky-400)]">
                  {net.ipAddress === '' ? EMPTY_MARK : net.ipAddress}
                </span>
                {net.ipAddress !== '' && <CopyButton value={net.ipAddress} label={t('detail.copyIp')} />}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-mono)] text-2xs text-muted-foreground">
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
