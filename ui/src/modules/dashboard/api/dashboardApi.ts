import { apiRequest } from '../../../api/client'

export type DashboardTask = {
  id: string
  title: string
  client: string
  candidate: string
  scheduleTime: string
  status: string
  expertId?: string | null
  assignedToName?: string
  description?: string
  fileUrl?: string
  dueDate?: string
  startTime?: string
  endTime?: string
  supportType?: string
  amount?: number
  duration?: number
  paymentStatus?: string
}

export type DashboardExpert = {
  id: string
  name: string
  status?: 'available' | 'not_available'
  isPresent: boolean
  isAvailable?: boolean
}

export type DashboardSummary = {
  totalTasks: number
  pendingTasks: number
  assignedTasks: number
  completedTasks: number
  cancelledTasks?: number
  totalClients: number
  expertsPresent: number
  expertsTotal: number
  pendingPaymentUpdates?: number
  pendingPaymentAmount?: number
}

type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'cancelled' | 'completed'
export type ManagerTaskStatus = TaskStatus

const asArray = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[]

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

const formatTime12h = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const normalized = raw.length >= 5 ? raw.slice(0, 5) : raw
  const date = new Date(`1970-01-01T${normalized}:00`)
  if (Number.isNaN(date.getTime())) return normalized
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

const normalizeTask = (task: Record<string, unknown>): DashboardTask => ({
  id: String(task.id ?? task.task_id ?? task.taskId ?? task._id ?? `${Date.now()}`),
  title: String(task.title ?? task.task_title ?? task.taskTitle ?? task.name ?? 'Untitled Task'),
  client: String(task.company_name ?? task.client_name ?? task.clientName ?? task.client ?? task.client_company ?? task.company ?? '—'),
  candidate: String(task.candidate_name ?? task.candidateName ?? task.candidate ?? '—'),
  scheduleTime: String(
    task.scheduleTime ??
      task.scheduledAt ??
      task.interviewTime ??
      (task.task_date && task.start_time && task.end_time
        ? `${task.task_date} ${formatTime12h(task.start_time)}-${formatTime12h(task.end_time)}`
        : task.due_date && task.time_start && task.time_end
          ? `${task.due_date} ${formatTime12h(task.time_start)}-${formatTime12h(task.time_end)}`
          : task.due_date ?? '—'),
  ),
  status: String(task.status ?? 'pending').toLowerCase(),
  expertId: String(task.expertId ?? task.expert_id ?? task.assigned_to_id ?? '') || null,
  assignedToName: String(task.assigned_to_name ?? task.expert_name ?? task.assignedToName ?? ''),
  amount: asNumber(task.total_amount ?? task.amount),
  duration: asNumber(task.duration),
  paymentStatus: String(task.payment_status ?? '').toLowerCase(),
  description: String(task.description ?? task.task_description ?? ''),
  fileUrl: String(task.file ?? task.file_url ?? task.attachment_url ?? task.attachment ?? ''),
  dueDate: String(task.task_date ?? task.due_date ?? task.date ?? ''),
  startTime: String(task.start_time ?? task.time_start ?? ''),
  endTime: String(task.end_time ?? task.time_end ?? ''),
  supportType: String(task.support_type ?? task.task_type ?? ''),
})

const normalizeExpert = (expert: Record<string, unknown>): DashboardExpert => ({
  id: String(expert.id ?? expert.userId ?? expert.user_id ?? expert._id),
  name: String(expert.name ?? expert.fullName ?? expert.full_name ?? expert.email ?? 'Unknown Expert'),
  status:
    String(expert.status ?? '').toLowerCase() === 'not_available'
      ? 'not_available'
      : 'available',
  isPresent: Boolean(expert.isPresent ?? expert.present ?? expert.isOnline),
  isAvailable:
    String(expert.status ?? '').toLowerCase() === 'not_available'
      ? false
      : Boolean(expert.isAvailable ?? expert.available ?? expert.is_available ?? true),
})

const normalizeSummary = (response: Record<string, unknown>) => ({
  totalTasks: asNumber(response.totalTasks ?? response.total_tasks),
  pendingTasks: asNumber(response.pendingTasks ?? response.pending_tasks),
  assignedTasks: asNumber(response.assignedTasks ?? response.assigned_tasks),
  completedTasks: asNumber(response.completedTasks ?? response.completed_tasks),
  cancelledTasks: asNumber(response.cancelledTasks ?? response.cancelled_tasks),
  totalClients: asNumber(response.totalClients ?? response.total_clients ?? response.clients),
  expertsPresent: asNumber(response.expertsPresent ?? response.experts_present),
  expertsTotal: asNumber(response.expertsTotal ?? response.experts_total ?? response.experts),
  pendingPaymentUpdates: asNumber(response.pendingPaymentUpdates ?? response.pending_payment_updates),
  pendingPaymentAmount: asNumber(response.pendingPaymentAmount ?? response.pending_payment_amount),
})

const managerStatusMap: Record<ManagerTaskStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const getTasksByStatusRequest = async (status: ManagerTaskStatus) => {
  const response = await apiRequest<unknown>(`/dashboard/tasks-by-status?status=${managerStatusMap[status]}`)
  const primary = asArray<Record<string, unknown>>(response).map((task) => normalizeTask({ ...task, status: task.status ?? status }))
  if (primary.length > 0) return primary

  const fallback = await apiRequest<unknown>(`/tasks/list?status=${status}`)
  return asArray<Record<string, unknown>>(fallback).map((task) => normalizeTask({ ...task, status: task.status ?? status }))
}

export const getManagerDashboardSummary = async () => {
  const response = await apiRequest<Record<string, unknown>>('/dashboard/summary')
  return normalizeSummary(response) as DashboardSummary
}

export const getManagerTasksByStatus = async (status: ManagerTaskStatus) => getTasksByStatusRequest(status)

export const getManagerAvailableExperts = async ({
  taskDate,
  startTime,
  endTime,
}: {
  taskDate: string
  startTime: string
  endTime: string
}) => {
  const query = new URLSearchParams({
    date: taskDate,
    start_time: startTime,
    end_time: endTime,
  })

  const response = await apiRequest<unknown>(`/dashboard/available-experts?${query.toString()}`)
  return asArray<Record<string, unknown>>(response).map(normalizeExpert)
}

export const assignManagerTask = async (taskId: string, expertId: string) => {
  return apiRequest<{ success?: boolean; email_status?: 'sent' | 'failed'; email_error?: string; message?: string }>('/dashboard/assign-task', {
    method: 'POST',
    body: JSON.stringify({
      task_id: taskId,
      expert_id: expertId,
    }),
  })
}

export const getDashboardTasksByStatus = async (status: TaskStatus) => getTasksByStatusRequest(status)

export const getDashboardSummary = async () => {
  const response = await apiRequest<Record<string, unknown>>('/dashboard/summary')
  return normalizeSummary(response) as DashboardSummary
}

export const getDashboardTasks = async (scope: 'all' | 'my' | 'team' = 'all') => {
  const path =
    scope === 'my' ? '/dashboard/my-tasks' : scope === 'team' ? '/dashboard/team-tasks' : '/dashboard/tasks'
  const response = await apiRequest<unknown>(path)
  return asArray<Record<string, unknown>>(response).map(normalizeTask)
}

export const getDashboardTasksByPaths = async (paths: string[]) => {
  let lastError: unknown = null

  for (const path of paths) {
    try {
      const response = await apiRequest<unknown>(path)
      return asArray<Record<string, unknown>>(response).map(normalizeTask)
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
  await apiRequest('/tasks/assign', {
    method: 'POST',
    body: JSON.stringify({
      task_id: Number(taskId),
      user_id: Number(expertId),
    }),
  })
}

export const updateDashboardTaskStatus = async (taskId: string, status: string) => {
  await apiRequest('/dashboard/update-status', {
    method: 'POST',
    body: JSON.stringify({ taskId, status }),
  })
}
