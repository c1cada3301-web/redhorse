import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'
import type {
  ApiContainer,
  ApiImage,
  BuildRequest,
  ContainerAction,
  DiskUsage,
  DockerNetwork,
  DockerVolume,
  JobStatus,
  PrunePreview,
  PruneResult,
  PruneTarget,
  SystemInfo,
} from './types'

export const keys = {
  containers: ['containers'] as const,
  container: (id: string) => ['containers', id] as const,
  images: ['images'] as const,
  jobs: ['images', 'jobs'] as const,
  info: ['system', 'info'] as const,
  df: ['system', 'df'] as const,
  networks: ['system', 'networks'] as const,
  volumes: ['system', 'volumes'] as const,
  prunePreview: ['cleanup', 'preview'] as const,
}

/** Список контейнеров переспрашиваем: состояние меняется и снаружи RedHorse. */
const CONTAINERS_POLL_MS = 4000

export function useContainersQuery(pollMs: number = CONTAINERS_POLL_MS) {
  return useQuery({
    queryKey: keys.containers,
    queryFn: () => request<ApiContainer[]>('/containers', { query: { all: true } }),
    // 0 в настройках означает «обновлять только вручную».
    refetchInterval: pollMs > 0 ? pollMs : false,
    staleTime: pollMs > 0 ? pollMs : Infinity,
  })
}

export function useContainerQuery(id: string | null) {
  return useQuery({
    queryKey: keys.container(id ?? ''),
    queryFn: () => request<ApiContainer>(`/containers/${id}`),
    enabled: id !== null,
    refetchInterval: CONTAINERS_POLL_MS,
  })
}

export function useContainerAction() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: ContainerAction }) =>
      request<void>(`/containers/${id}/${action}`, { method: 'POST' }),
    onSettled: () => client.invalidateQueries({ queryKey: keys.containers }),
  })
}

export function useRemoveContainer() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, force = true, volumes = false }: { id: string; force?: boolean; volumes?: boolean }) =>
      request<void>(`/containers/${id}`, { method: 'DELETE', query: { force, volumes } }),
    onSettled: () => client.invalidateQueries({ queryKey: keys.containers }),
  })
}

export function useImagesQuery() {
  return useQuery({
    queryKey: keys.images,
    queryFn: () => request<ApiImage[]>('/images'),
    staleTime: 10_000,
  })
}

export function useBuildImage() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: BuildRequest) => request<JobStatus>('/images/build', { method: 'POST', body }),
    onSettled: () => client.invalidateQueries({ queryKey: keys.jobs }),
  })
}

export function usePullImage() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: { repository: string; tag: string }) =>
      request<JobStatus>('/images/pull', { method: 'POST', body }),
    onSettled: () => client.invalidateQueries({ queryKey: keys.jobs }),
  })
}

export function useRemoveImage() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) =>
      request<void>(`/images/${encodeURIComponent(id)}`, { method: 'DELETE', query: { force } }),
    onSettled: () => client.invalidateQueries({ queryKey: keys.images }),
  })
}

export function usePruneImages() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (danglingOnly: boolean) =>
      request<{ deleted: number; reclaimed: number }>('/images/prune', {
        method: 'DELETE',
        query: { dangling_only: danglingOnly },
      }),
    onSettled: () => client.invalidateQueries({ queryKey: keys.images }),
  })
}

export function useJobsQuery() {
  return useQuery({ queryKey: keys.jobs, queryFn: () => request<JobStatus[]>('/images/jobs') })
}

export function useSystemInfo() {
  return useQuery({ queryKey: keys.info, queryFn: () => request<SystemInfo>('/system/info'), staleTime: 30_000 })
}

export function useDiskUsage() {
  return useQuery({ queryKey: keys.df, queryFn: () => request<DiskUsage>('/system/df'), staleTime: 30_000 })
}

export function useNetworksQuery() {
  return useQuery({ queryKey: keys.networks, queryFn: () => request<DockerNetwork[]>('/system/networks') })
}

export function useVolumesQuery() {
  return useQuery({ queryKey: keys.volumes, queryFn: () => request<DockerVolume[]>('/system/volumes') })
}

export function usePrunePreview() {
  return useQuery({
    queryKey: keys.prunePreview,
    queryFn: () => request<PrunePreview>('/cleanup/preview'),
    staleTime: 10_000,
  })
}

export function usePrune() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ target, allUnused = false }: { target: PruneTarget; allUnused?: boolean }) =>
      request<PruneResult>(`/cleanup/${target}`, { method: 'POST', query: { all_unused: allUnused } }),
    // Очистка задевает всё сразу: списки, размеры на диске, предпросмотр.
    onSettled: () => client.invalidateQueries(),
  })
}
