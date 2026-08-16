interface SparklineProps {
  values: number[]
  color?: string
  width?: number
  height?: number
  /** Верхняя граница шкалы; по умолчанию — максимум ряда. */
  max?: number
}

export function Sparkline({
  values,
  color = 'var(--color-ember-400)',
  width = 96,
  height = 28,
  max,
}: SparklineProps) {
  if (values.length < 2) {
    return <div style={{ width, height }} />
  }

  const peak = Math.max(max ?? 0, ...values, 0.0001)
  const step = width / (values.length - 1)
  const toY = (value: number) => height - (value / peak) * (height - 2) - 1

  const points = values.map((value, index) => `${(index * step).toFixed(2)},${toY(value).toFixed(2)}`)
  const gradientId = `spark-${Math.abs(peak).toFixed(0)}-${values.length}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
