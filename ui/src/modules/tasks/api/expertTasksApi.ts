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
  file_url: string
}

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
