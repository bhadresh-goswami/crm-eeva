import { apiRequest } from '../../../api/client'

export type ExpertTaskItem = {
  task_id: number
  candidate_name: string
  company_name: string
  title: string
  description: string
  due_date: string
  start_time: string
  end_time: string
  status_id: number
  status_name: string
  assigned_to_id: number
  assigned_to_name: string
  assigned_by_name: string
  is_own_task: number
  file_url: string
}

export type EndTaskStatus = 'Completed' | 'Cancelled' | 'No Show' | 'Rescheduled'

const asTask = (item: Record<string, unknown>): ExpertTaskItem => ({
  task_id: Number(item.task_id ?? 0),
  candidate_name: String(item.candidate_name ?? '').trim(),
  company_name: String(item.company_name ?? '').trim(),
  title: String(item.title ?? '').trim(),
  description: String(item.description ?? '').trim(),
  due_date: String(item.due_date ?? '').trim(),
  start_time: String(item.start_time ?? '').trim(),
  end_time: String(item.end_time ?? '').trim(),
  status_id: Number(item.status_id ?? 0),
  status_name: String(item.status_name ?? '').trim(),
  assigned_to_id: Number(item.assigned_to_id ?? 0),
  assigned_to_name: String(item.assigned_to_name ?? '').trim(),
  assigned_by_name: String(item.assigned_by_name ?? '').trim(),
  is_own_task: Number(item.is_own_task ?? 0),
  file_url: String(item.file_url ?? '').trim(),
})

export const getExpertTasks = async ({ activeOnly = false }: { activeOnly?: boolean } = {}) => {
  const endpoint = activeOnly ? '/expert/tasks?active_only=1' : '/expert/tasks'
  const response = await apiRequest<{ data?: unknown[] }>(endpoint)
  const list = Array.isArray(response?.data) ? response.data : []

  return list
    .map((item) => (item && typeof item === 'object' ? asTask(item as Record<string, unknown>) : null))
    .filter((item): item is ExpertTaskItem => Boolean(item && item.task_id > 0))
}

export const checkExpertActiveTask = async () => {
  const response = await apiRequest<{ has_active_task?: boolean; active_task_id?: number | null }>('/expert/tasks/active-check')
  return {
    hasActiveTask: Boolean(response?.has_active_task),
    activeTaskId: Number(response?.active_task_id ?? 0) || null,
  }
}

export const startExpertTask = async (taskId: number) => {
  await apiRequest('/expert/tasks/start', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId }),
  })
}

export const endExpertTask = async (taskId: number, status: EndTaskStatus, comment: string) => {
  await apiRequest('/expert/tasks/end', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, status, comment }),
  })
}
