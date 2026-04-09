import { apiRequest } from '../../../api/client'

export type DashboardTask = {
  id: string
  title: string
  client: string
  candidate: string
  scheduleTime: string
  status: string
  expertId?: string | null
}

export type DashboardExpert = {
  id: string
  name: string
  isPresent: boolean
}

export type DashboardSummary = {
  totalTasks: number
  pendingTasks: number
  assignedTasks: number
  completedTasks: number
  totalClients: number
  expertsPresent: number
  expertsTotal: number
}

type ManagerDashboardPayload = {
  summary: DashboardSummary
  pendingTasks: DashboardTask[]
  assignedTasks: DashboardTask[]
}

const asArray = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>
    if (Array.isArray(data.data)) return data.data as T[]
    if (Array.isArray(data.tasks)) return data.tasks as T[]
    if (Array.isArray(data.experts)) return data.experts as T[]
    if (Array.isArray(data.items)) return data.items as T[]
  }

  return []
}

const asNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const normalizeTask = (task: Record<string, unknown>): DashboardTask => ({
  id: String(task.id ?? task.taskId ?? task._id ?? `${Date.now()}`),
  title: String(task.title ?? task.taskTitle ?? task.name ?? 'Untitled Task'),
  client: String(task.clientName ?? task.client ?? task.client_company ?? '—'),
  candidate: String(task.candidateName ?? task.candidate ?? '—'),
  scheduleTime: String(task.scheduleTime ?? task.scheduledAt ?? task.interviewTime ?? '—'),
  status: String(task.status ?? 'pending').toLowerCase(),
  expertId: typeof task.expertId === 'string' ? task.expertId : null,
})

const normalizeExpert = (expert: Record<string, unknown>): DashboardExpert => ({
  id: String(expert.id ?? expert.userId ?? expert._id),
  name: String(expert.name ?? expert.fullName ?? expert.email ?? 'Unknown Expert'),
  isPresent: Boolean(expert.isPresent ?? expert.present ?? expert.isOnline),
})

const requestTaskPath = async (path: string) => {
  const response = await apiRequest<unknown>(path)
  return asArray<Record<string, unknown>>(response).map(normalizeTask)
}

const normalizeSummary = (response: Record<string, unknown>) => ({
  totalTasks: asNumber(response.totalTasks ?? response.total_tasks),
  pendingTasks: asNumber(response.pendingTasks ?? response.pending_tasks),
  assignedTasks: asNumber(response.assignedTasks ?? response.assigned_tasks),
  completedTasks: asNumber(response.completedTasks ?? response.completed_tasks),
  totalClients: asNumber(response.totalClients ?? response.total_clients ?? response.clients),
  expertsPresent: asNumber(response.expertsPresent ?? response.experts_present),
  expertsTotal: asNumber(response.expertsTotal ?? response.experts_total ?? response.experts),
})

export const getManagerDashboardData = async (): Promise<ManagerDashboardPayload> => {
  const [summaryResponse, pendingResponse, assignedResponse] = await Promise.all([
    apiRequest<Record<string, unknown>>('/dashboard/summary'),
    apiRequest<unknown>('/tasks/list?status=pending'),
    apiRequest<unknown>('/tasks/list?status=assigned'),
  ])

  return {
    summary: normalizeSummary(summaryResponse),
    pendingTasks: asArray<Record<string, unknown>>(pendingResponse).map((task) =>
      normalizeTask({ ...task, status: task.status ?? 'pending' }),
    ),
    assignedTasks: asArray<Record<string, unknown>>(assignedResponse).map((task) =>
      normalizeTask({ ...task, status: task.status ?? 'assigned' }),
    ),
  }
}

export const getDashboardSummary = async () => {
  const response = await apiRequest<Record<string, unknown>>('/dashboard/summary')
  return normalizeSummary(response) as DashboardSummary
}

export const getDashboardTasks = async (scope: 'all' | 'my' | 'team' = 'all') => {
  const path =
    scope === 'my' ? '/dashboard/my-tasks' : scope === 'team' ? '/dashboard/team-tasks' : '/dashboard/tasks'
  return requestTaskPath(path)
}

export const getDashboardTasksByPaths = async (paths: string[]) => {
  let lastError: unknown = null

  for (const path of paths) {
    try {
      return await requestTaskPath(path)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to load tasks for current role.')
}

export const getDashboardExperts = async () => {
  const response = await apiRequest<unknown>('/dashboard/experts')
  return asArray<Record<string, unknown>>(response).map(normalizeExpert)
}

export const assignDashboardTask = async (taskId: string, expertId: string) => {
  await apiRequest('/dashboard/assign', {
    method: 'POST',
    body: JSON.stringify({ taskId, expertId }),
  })
}

export const updateDashboardTaskStatus = async (taskId: string, status: string) => {
  await apiRequest('/dashboard/update-status', {
    method: 'POST',
    body: JSON.stringify({ taskId, status }),
  })
}
