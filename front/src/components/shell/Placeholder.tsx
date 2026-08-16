import type { ReactNode } from 'react'

interface PlaceholderProps {
  title: string
  description: string
  points: string[]
  icon: ReactNode
}

export function Placeholder({ title, description, points, icon }: PlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="rh-panel max-w-lg p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-ember-500)]/12 text-[var(--color-ember-400)]">
          {icon}
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/45">{description}</p>

        <ul className="mt-5 space-y-2 text-left">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-[13px] text-white/60">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ember-500)]" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
