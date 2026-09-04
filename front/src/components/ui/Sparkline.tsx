
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
  // id обязан быть уникальным: раньше он собирался из пика и длины ряда,
  // и два спарклайна с одинаковыми данными делили градиент — второй
  // подхватывал цвет первого.
  // useId отдаёт значение со спецсимволами, а на него ссылается url(#…) —
  // оставляем только буквы и цифры.

  if (values.length < 2) {
    return <div style={{ width, height }} />
  }

  const peak = Math.max(max ?? 0, ...values, 0.0001)
  const step = width / (values.length - 1)
  const toY = (value: number) => height - (value / peak) * (height - 2) - 1

  const points = values.map((value, index) => `${(index * step).toFixed(2)},${toY(value).toFixed(2)}`)

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill={color}
        fillOpacity="var(--rh-area-fill)"
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
