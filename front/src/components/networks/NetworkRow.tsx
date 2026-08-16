import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DockerNetwork } from '../../api/types'
import { shortId } from '../../lib/format'

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
  const system = SYSTEM_NAMES.has(network.name)

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.015] transition-colors hover:border-white/12 hover:bg-white/[0.035]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`${NETWORK_GRID} w-full cursor-pointer px-3 py-2.5 text-left`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-white">{network.name}</span>

            {network.internal && (
              <span className="shrink-0 rounded bg-[var(--color-amber-ok)]/12 px-1 text-[9px] text-[var(--color-amber-ok)]">
                internal
              </span>
            )}

            {system && (
              <span className="shrink-0 rounded bg-white/6 px-1 text-[9px] text-white/35">системная</span>
            )}
          </div>

          <div className="mt-0.5 truncate font-[family-name:var(--font-mono)] text-[11px] text-white/35">
            {shortId(network.id)}
          </div>
        </div>

        <div className="truncate font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-sky-400)]/70">
          {network.driver}
        </div>

        <div className="truncate font-[family-name:var(--font-mono)] text-[11px] text-white/45">
          {network.scope}
        </div>

        <div className="truncate font-[family-name:var(--font-mono)] text-[11px] text-white/55">
          {network.subnets.length === 0 ? <span className="text-white/20">—</span> : network.subnets.join(', ')}
        </div>

        <div className="font-[family-name:var(--font-mono)] text-[11px]">
          {network.members.length === 0 ? (
            <span className="text-white/25">пусто</span>
          ) : (
            <span className="text-[var(--color-mint-400)]">{network.members.length}</span>
          )}
        </div>

        <div className="flex justify-end text-white/35">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="rh-fade-in border-t border-white/6 px-3 py-3">
          {network.members.length === 0 ? (
            <p className="text-[12px] text-white/35">В этой сети нет контейнеров</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {network.members.map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-[var(--color-mint-400)]/25 bg-[var(--color-mint-400)]/8 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-mint-400)]"
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
