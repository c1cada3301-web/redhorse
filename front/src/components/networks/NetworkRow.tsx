import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DockerNetwork } from '../../api/types'
import { shortId } from '../../lib/format'
import { useT } from '@/state/settings'

export const NETWORK_GRID =
  'grid grid-cols-[minmax(200px,1.7fr)_96px_88px_minmax(150px,1fr)_116px_28px] items-center gap-3'

/** Эти сети Docker создаёт сам — их не удалить и не переименовать. */
const SYSTEM_NAMES = new Set(['bridge', 'host', 'none'])

export interface NetworkView extends DockerNetwork {
  /** Имена контейнеров в сети — главное, ради чего страница и нужна. */
  members: string[]
}

interface NetworkRowProps {
  network: NetworkView
  expanded: boolean
  onToggle: () => void
}

export function NetworkRow({ network, expanded, onToggle }: NetworkRowProps) {
  const t = useT()
  const system = SYSTEM_NAMES.has(network.name)

  return (
    <div className="border-b border-border transition-colors hover:bg-foreground/4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`${NETWORK_GRID} w-full cursor-pointer px-3 py-2.5 text-left`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-medium text-foreground">{network.name}</span>

            {network.internal && (
              <span className="shrink-0 rounded bg-[var(--color-amber-ok)]/12 px-1 text-2xs text-[var(--color-amber-ok)]">
                internal
              </span>
            )}

            {system && (
              <span className="shrink-0 rounded bg-fg/6 px-1 text-2xs text-muted-foreground">{t('networks.system')}</span>
            )}
          </div>

          <div className="mt-0.5 truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
            {shortId(network.id)}
          </div>
        </div>

        <div className="truncate font-[family-name:var(--font-mono)] text-xs text-[var(--color-sky-400)]/70">
          {network.driver}
        </div>

        <div className="truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          {network.scope}
        </div>

        <div className="truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          {network.subnets.length === 0 ? <span className="text-muted-foreground">—</span> : network.subnets.join(', ')}
        </div>

        <div className="font-[family-name:var(--font-mono)] text-xs">
          {network.members.length === 0 ? (
            <span className="text-muted-foreground">{t('networks.empty')}</span>
          ) : (
            <span className="text-[var(--color-mint-400)]">{network.members.length}</span>
          )}
        </div>

        <div className="flex justify-end text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="rh-fade-in border-t border-border px-3 py-3">
          {network.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('networks.noContainers')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {network.members.map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-[var(--color-mint-400)]/25 bg-[var(--color-mint-400)]/8 px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-mint-400)]"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
