import { Info } from 'lucide-react'
import type { ContainerDetails } from '../../api/types'
import { DetailField, DetailPanel, formatDateTime } from './DetailPrimitives'
import { useT } from '@/state/settings'

export function DetailOverview({ container }: { container: ContainerDetails }) {
  const t = useT()
  const entrypoint = container.entrypoint.join(' ')
  const ports = container.ports.join(', ')

  return (
    <DetailPanel title={t('detail.overview')} icon={<Info className="h-4 w-4" />}>
      <div className="grid gap-1.5 lg:grid-cols-2">
        <DetailField label="ID" value={container.id} copyable />
        <DetailField label={t('detail.name')} value={container.name} copyable />
        <DetailField label={t('detail.image')} value={container.image} copyable />
        <DetailField label={t('detail.command')} value={container.command} copyable />
        <DetailField label="Entrypoint" value={entrypoint} copyable />
        <DetailField label={t('detail.workdir')} value={container.workingDir} />
        <DetailField label={t('detail.user')} value={container.user} />
        <DetailField label={t('detail.platform')} value={container.platform} />
        <DetailField label={t('detail.storageDriver')} value={container.driver} />
        <DetailField label={t('detail.logFile')} value={container.logPath} copyable />
        <DetailField label={t('detail.ports')} value={ports} tone="sky" />
        <DetailField label={t('detail.stack')} value={container.stack ?? ''} />
        <DetailField label={t('detail.created')} value={formatDateTime(container.createdAt)} mono={false} />
        <DetailField label={t('detail.started')} value={formatDateTime(container.startedAt)} mono={false} />
      </div>
    </DetailPanel>
  )
}
