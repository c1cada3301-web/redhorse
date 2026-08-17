import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

export interface Series {
  values: number[]
  color: string
  label: string
}

interface AreaChartProps {
  series: Series[]
  height?: number
  /** Форматирование значения для подписей осей и подсказки. */
  format: (value: number) => string
  /** Фиксированный максимум оси Y; если не задан — считается по данным. */
  max?: number
}

/** Место под подписи оси Y слева и небольшие поля вокруг поля графика. */
const PAD_LEFT = 56
const PAD_RIGHT = 10
const PAD_TOP = 10
const PAD_BOTTOM = 8

/** Сколько интервалов сетки: линий будет на одну больше. */
const DIVISIONS = 3

export function AreaChart({ series, height = 148, format, max }: AreaChartProps) {
  const [wrapRef, width] = useElementWidth()
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId()

  const points = useMemo(
    () => series.reduce((longest, item) => Math.max(longest, item.values.length), 0),
    [series],
  )

  const peak = useMemo(() => resolvePeak(series, max), [series, max])

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT)
  const plotH = Math.max(0, height - PAD_TOP - PAD_BOTTOM)
  const step = points > 1 ? plotW / (points - 1) : 0
  const ready = width > 0 && points > 1 && plotW > 0

  const toX = useCallback((index: number) => PAD_LEFT + index * step, [step])
  const toY = useCallback(
    (value: number) => PAD_TOP + plotH - Math.min(1, value / peak) * plotH,
    [plotH, peak],
  )

  const handleMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!ready) return

      const rect = event.currentTarget.getBoundingClientRect()
      const ratio = (event.clientX - rect.left - PAD_LEFT) / plotW
      const index = Math.round(Math.min(1, Math.max(0, ratio)) * (points - 1))

      setHover(index)
    },
    [ready, plotW, points],
  )

  const gridValues = useMemo(
    () => Array.from({ length: DIVISIONS + 1 }, (_, index) => (peak * (DIVISIONS - index)) / DIVISIONS),
    [peak],
  )

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {series.map((item, index) => (
              <linearGradient
                key={item.label}
                id={`${gradientId}-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {gridValues.map((value, index) => {
            const y = PAD_TOP + (plotH * index) / DIVISIONS

            return (
              <g key={index}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={width - PAD_RIGHT}
                  y2={y}
                  stroke="rgb(255 255 255 / 0.07)"
                  strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgb(255 255 255 / 0.28)"
                  fontSize="10"
                  className="font-[family-name:var(--font-mono)]"
                >
                  {format(value)}
                </text>
              </g>
            )
          })}

          {ready &&
            series.map((item, index) => {
              const coords = alignedCoords(item.values, points, toX, toY)
              if (coords.length < 2) return null

              const line = coords.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
              const base = PAD_TOP + plotH
              const first = coords[0]
              const last = coords[coords.length - 1]

              return (
                <g key={item.label}>
                  <polygon
                    points={`${first.x.toFixed(2)},${base} ${line} ${last.x.toFixed(2)},${base}`}
                    fill={`url(#${gradientId}-${index})`}
                  />
                  <polyline
                    points={line}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              )
            })}

          {ready && hover !== null && (
            <g>
              <line
                x1={toX(hover)}
                y1={PAD_TOP}
                x2={toX(hover)}
                y2={PAD_TOP + plotH}
                stroke="rgb(255 255 255 / 0.25)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {series.map((item) => {
                const value = valueAt(item.values, points, hover)
                if (value === null) return null

                return (
                  <circle
                    key={item.label}
                    cx={toX(hover)}
                    cy={toY(value)}
                    r="2.8"
                    fill="var(--color-ink-900)"
                    stroke={item.color}
                    strokeWidth="1.6"
                  />
                )
              })}
            </g>
          )}

          {!ready && (
            <text
              x={PAD_LEFT + plotW / 2}
              y={PAD_TOP + plotH / 2}
              textAnchor="middle"
              fill="rgb(255 255 255 / 0.25)"
              fontSize="11"
            >
              копим данные…
            </text>
          )}
        </svg>
      )}

      {ready && hover !== null && (
        <Tooltip series={series} points={points} index={hover} x={toX(hover)} width={width} format={format} />
      )}
    </div>
  )
}

interface TooltipProps {
  series: Series[]
  points: number
  index: number
  x: number
  width: number
  format: (value: number) => string
}

function Tooltip({ series, points, index, x, width, format }: TooltipProps) {
  // У правого края разворачиваем подсказку влево, чтобы не выезжала за панель.
  const flip = x > width / 2
  const behind = points - 1 - index

  return (
    <div
      className="pointer-events-none absolute top-1 z-10 rounded-lg border border-fg/10 bg-[var(--color-ink-900)]/95 px-2 py-1.5 shadow-lg"
      style={{ left: x, transform: flip ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)' }}
    >
      <div className="mb-1 font-[family-name:var(--font-mono)] text-[10px] text-fg/30">
        {behind === 0 ? 'сейчас' : `−${behind} с`}
      </div>
      {series.map((item) => {
        const value = valueAt(item.values, points, index)

        return (
          <div key={item.label} className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
            <span className="text-[11px] text-fg/45">{item.label}</span>
            <span className="ml-auto font-[family-name:var(--font-mono)] text-[11px] text-fg/85">
              {value === null ? '—' : format(value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Ряды бывают разной длины — считаем, что совпадают их правые (свежие) края. */
function valueAt(values: number[], points: number, index: number): number | null {
  const shifted = index - (points - values.length)
  const value = values[shifted]

  return value === undefined ? null : value
}

function alignedCoords(
  values: number[],
  points: number,
  toX: (index: number) => number,
  toY: (value: number) => number,
): { x: number; y: number }[] {
  const offset = points - values.length

  return values.map((value, index) => ({ x: toX(index + offset), y: toY(value) }))
}

function resolvePeak(series: Series[], max?: number): number {
  if (max !== undefined && max > 0) return max

  const found = series.reduce(
    (top, item) => item.values.reduce((inner, value) => (value > inner ? value : inner), top),
    0,
  )

  return found > 0 ? niceCeil(found) : 1
}

/** Округляем верх шкалы до «красивого» числа, иначе подписи осей выглядят случайными. */
function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((candidate) => candidate >= normalized) ?? 10

  return step * magnitude
}

function useElementWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (node === null) return

    setWidth(node.clientWidth)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry === undefined) return

      setWidth(Math.round(entry.contentRect.width))
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
