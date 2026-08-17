import { Info } from 'lucide-react'
import type { ContainerDetails } from '../../api/types'
import { DetailField, DetailPanel, formatDateTime } from './DetailPrimitives'

export function DetailOverview({ container }: { container: ContainerDetails }) {
  const entrypoint = container.entrypoint.join(' ')
  const ports = container.ports.join(', ')

  return (
    <DetailPanel title="Основное" icon={<Info className="h-4 w-4" />}>
      <div className="grid gap-1.5 lg:grid-cols-2">
        <DetailField label="ID" value={container.id} copyable />
        <DetailField label="Имя" value={container.name} copyable />
        <DetailField label="Образ" value={container.image} copyable />
        <DetailField label="Команда" value={container.command} copyable />
        <DetailField label="Entrypoint" value={entrypoint} copyable />
        <DetailField label="Рабочая папка" value={container.workingDir} />
        <DetailField label="Пользователь" value={container.user} />
        <DetailField label="Платформа" value={container.platform} />
        <DetailField label="Драйвер хранилища" value={container.driver} />
        <DetailField label="Файл логов" value={container.logPath} copyable />
        <DetailField label="Порты" value={ports} tone="sky" />
        <DetailField label="Стек" value={container.stack ?? ''} />
        <DetailField label="Создан" value={formatDateTime(container.createdAt)} mono={false} />
        <DetailField label="Запущен" value={formatDateTime(container.startedAt)} mono={false} />
      </div>
    </DetailPanel>
  )
}
