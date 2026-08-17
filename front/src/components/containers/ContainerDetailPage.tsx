import { useCallback } from 'react'
import { ApiError } from '../../api/client'
import { useContainerDetails } from '../../api/queries'
import { DetailEnv } from './DetailEnv'
import { DetailHeader } from './DetailHeader'
import type { DetailAction } from './DetailHeader'
import { DetailLabels } from './DetailLabels'
import { DetailLimits } from './DetailLimits'
import { DetailMounts } from './DetailMounts'
import { DetailNetworks } from './DetailNetworks'
import { DetailOverview } from './DetailOverview'
import { DetailFailure, DetailMissing, DetailSkeleton } from './DetailStates'
import { DetailStatus } from './DetailStatus'

interface ContainerDetailPageProps {
  containerId: string
  onBack: () => void
  onOpenLogs: (containerId: string, containerName: string) => void
  onAction: (id: string, action: 'start' | 'stop' | 'restart' | 'pause' | 'kill') => void
  onRemove: (id: string) => void
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message

  return 'Неизвестная ошибка'
}

export function ContainerDetailPage({
  containerId,
  onBack,
  onOpenLogs,
  onAction,
  onRemove,
}: ContainerDetailPageProps) {
  const details = useContainerDetails(containerId)

  const handleAction = useCallback(
    (action: DetailAction) => onAction(containerId, action),
    [containerId, onAction],
  )

  const handleRemove = useCallback(() => onRemove(containerId), [containerId, onRemove])

  if (details.error !== null) {
    // Контейнер могли удалить из другого места — это не поломка, а нормальный исход.
    if (details.error instanceof ApiError && details.error.status === 404) {
      return <DetailMissing onBack={onBack} />
    }

    return (
      <DetailFailure
        message={errorMessage(details.error)}
        onRetry={() => void details.refetch()}
        onBack={onBack}
      />
    )
  }

  const container = details.data

  if (container === undefined) return <DetailSkeleton onBack={onBack} />

  return (
    <div className="rh-scroll h-full space-y-3 overflow-y-auto p-4">
      <DetailHeader
        container={container}
        onBack={onBack}
        onOpenLogs={() => onOpenLogs(container.id, container.name)}
        onAction={handleAction}
        onRemove={handleRemove}
      />

      <DetailStatus container={container} />
      <DetailOverview container={container} />
      <DetailEnv env={container.env} />

      <div className="grid gap-3 lg:grid-cols-2">
        <DetailMounts mounts={container.mounts} />
        <DetailNetworks networks={container.networkDetails} />
      </div>

      <DetailLimits container={container} />
      <DetailLabels labels={container.labels} />
    </div>
  )
}
