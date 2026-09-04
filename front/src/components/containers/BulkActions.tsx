import { Pause, Play, RotateCw, Square, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useT } from '@/state/settings'

export type BulkAction = 'start' | 'stop' | 'restart' | 'pause' | 'remove'

interface BulkActionsProps {
  count: number
  onRun: (action: BulkAction) => void
  onClear: () => void
}

/**
 * Панель групповых действий. Появляется только когда что-то выбрано — пустая
 * строка кнопок над списком занимала бы место и сбивала с толку.
 */
export function BulkActions({ count, onRun, onClear }: BulkActionsProps) {
  const t = useT()
  const [confirming, setConfirming] = useState(false)

  if (count === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-foreground/4 px-4 py-2">
      <span className="text-sm text-foreground/85">{t('bulk.selected', { count })}</span>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => onRun('start')}>
          <Play />
          {t('containers.action.start')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onRun('stop')}>
          <Square />
          {t('containers.action.stop')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onRun('restart')}>
          <RotateCw />
          {t('containers.action.restart')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onRun('pause')}>
          <Pause />
          {t('containers.action.pause')}
        </Button>
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 />
          {t('containers.action.remove')}
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
        <X />
        {t('bulk.clear')}
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('bulk.remove.title', { count })}
        description={t('bulk.remove.text')}
        onConfirm={() => onRun('remove')}
      />
    </div>
  )
}
