import {
  ArrowDownToLine,
  Clock,
  Copy,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  WrapText,
  X,
} from 'lucide-react'
import type { LogLevel, LogLine, LogViewOptions } from '../../types'
import type { TimeRange } from '../../lib/timeRange'
import { IconButton } from '../ui/IconButton'
import { countByLevel, linesToText } from '../../lib/logFilter'
import { TimeRangePicker } from './TimeRangePicker'
import { useT } from '@/state/settings'

const LEVELS: { key: LogLevel; label: string; className: string }[] = [
  { key: 'debug', label: 'DBG', className: 'text-muted-foreground' },
  { key: 'info', label: 'INF', className: 'text-[var(--color-sky-400)]' },
  { key: 'warn', label: 'WRN', className: 'text-[var(--color-amber-ok)]' },
  { key: 'error', label: 'ERR', className: 'text-[var(--color-danger)]' },
]

interface LogToolbarProps {
  options: LogViewOptions
  allLines: LogLine[]
  filteredCount: number
  containerName: string
  range: TimeRange
  onRangeChange: (range: TimeRange) => void
  onChange: (patch: Partial<LogViewOptions>) => void
  onClear: () => void
}

export function LogToolbar({
  options,
  allLines,
  filteredCount,
  containerName,
  range,
  onRangeChange,
  onChange,
  onClear,
}: LogToolbarProps) {
  const t = useT()
  const counts = countByLevel(allLines)

  // Выгружаем ровно то, что видно на экране: под маской — с маской.
  const exportText = () => linesToText(allLines, options.showTimestamps, options.masked)

  const handleDownload = () => {
    const blob = new Blob([exportText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${containerName}-logs.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    void navigator.clipboard.writeText(exportText())
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-bg/20 px-2 py-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={options.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder={t('logs.bar.grep')}
          className="h-7 w-44 rounded-md border border-border bg-bg/30 pr-6 pl-7 text-xs text-foreground/90 outline-none placeholder:text-muted-foreground focus:border-[var(--color-ember-500)]/60"
        />
        {options.search !== '' && (
          <button
            type="button"
            onClick={() => onChange({ search: '' })}
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={t('logs.bar.clearSearch')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <TimeRangePicker value={range} onChange={onRangeChange} />

      <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg/25 p-0.5">
        {LEVELS.map((level) => (
          <button
            key={level.key}
            type="button"
            onClick={() => onChange({ levels: { ...options.levels, [level.key]: !options.levels[level.key] } })}
            title={`${level.label}: ${counts[level.key]}`}
            className={[
              'rounded px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-2xs tracking-wide transition-colors',
              options.levels[level.key]
                ? `bg-fg/8 ${level.className}`
                : 'text-muted-foreground line-through',
            ].join(' ')}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="mx-0.5 h-4 w-px bg-fg/8" />

      <IconButton
        label={options.paused ? t('logs.bar.resume') : t('logs.bar.pause')}
        active={options.paused}
        onClick={() => onChange({ paused: !options.paused })}
      >
        {options.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </IconButton>

      <IconButton
        label={t('logs.bar.autoscroll')}
        active={options.follow}
        onClick={() => onChange({ follow: !options.follow })}
      >
        <ArrowDownToLine className="h-4 w-4" />
      </IconButton>

      <IconButton
        label={t('logs.bar.wrap')}
        active={options.wrap}
        onClick={() => onChange({ wrap: !options.wrap })}
      >
        <WrapText className="h-4 w-4" />
      </IconButton>

      <IconButton
        label={t('logs.bar.timestamps')}
        active={options.showTimestamps}
        onClick={() => onChange({ showTimestamps: !options.showTimestamps })}
      >
        <Clock className="h-4 w-4" />
      </IconButton>

      <IconButton
        label={options.masked ? t('logs.bar.showSecrets') : t('logs.bar.hideSecrets')}
        active={options.masked}
        onClick={() => onChange({ masked: !options.masked })}
      >
        {options.masked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </IconButton>

      <div className="mx-0.5 h-4 w-px bg-fg/8" />

      <IconButton
        label={t('logs.bar.smaller')}
        onClick={() => onChange({ fontSize: Math.max(9, options.fontSize - 1) })}
      >
        <Minus className="h-4 w-4" />
      </IconButton>
      <span className="w-6 text-center font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
        {options.fontSize}
      </span>
      <IconButton
        label={t('logs.bar.bigger')}
        onClick={() => onChange({ fontSize: Math.min(22, options.fontSize + 1) })}
      >
        <Plus className="h-4 w-4" />
      </IconButton>

      <div className="mx-0.5 h-4 w-px bg-fg/8" />

      <IconButton label={t('logs.bar.copy')} onClick={handleCopy}>
        <Copy className="h-4 w-4" />
      </IconButton>
      <IconButton label={t('logs.bar.download')} onClick={handleDownload}>
        <Download className="h-4 w-4" />
      </IconButton>
      <IconButton label={t('logs.bar.clear')} tone="danger" onClick={onClear}>
        <Eraser className="h-4 w-4" />
      </IconButton>

      <div className="ml-auto pr-1 font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
        {filteredCount === allLines.length
          ? `${allLines.length} строк`
          : `${filteredCount} / ${allLines.length}`}
      </div>
    </div>
  )
}
