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
  task_start_time: string
  task_end_time: string
  duration: number
  support_type: string
  task_type: string
  status_id: number
  status_name: string
  assigned_to_id: number
  assigned_to_name: string
  assigned_by_name: string
  is_own_task: number
  file_url: string
  resume_url: string
  candidate_resume: string
  feedback_action: 'ADD' | 'VIEW'
  feedback_overall: number
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
  task_start_time: String(item.task_start_time ?? '').trim(),
  task_end_time: String(item.task_end_time ?? '').trim(),
  duration: Number(item.duration ?? 0),
  support_type: String(item.support_type ?? '').trim(),
  task_type: String(item.task_type ?? item.support_type ?? '').trim(),
  status_id: Number(item.status_id ?? 0),
  status_name: String(item.status_name ?? '').trim(),
  assigned_to_id: Number(item.assigned_to_id ?? 0),
  assigned_to_name: String(item.assigned_to_name ?? '').trim(),
  assigned_by_name: String(item.assigned_by_name ?? '').trim(),
  is_own_task: Number(item.is_own_task ?? 0),
  file_url: String(item.file_url ?? '').trim(),
  resume_url: String(item.resume_url ?? item.candidate_resume ?? item.resume ?? '').trim(),
  candidate_resume: String(item.candidate_resume ?? item.resume_url ?? item.resume ?? '').trim(),
  feedback_action: String(item.feedback_action ?? '').trim().toUpperCase() === 'VIEW' ? 'VIEW' : 'ADD',
  feedback_overall: Number(item.feedback_overall ?? 0),
})

export const getExpertTasks = async ({
  activeOnly = false,
  status,
  fromDate,
  toDate,
  taskTypeId,
  feedbackOnly,
}: {
  activeOnly?: boolean
  status?: string
  fromDate?: string
  toDate?: string
  taskTypeId?: number
  feedbackOnly?: boolean
} = {}) => {
  const params = new URLSearchParams()
  if (activeOnly) params.set('active_only', '1')
  if (status) params.set('status', status)
  if (fromDate) params.set('from_date', fromDate)
  if (toDate) params.set('to_date', toDate)
  if (taskTypeId && taskTypeId > 0) params.set('task_type_id', String(taskTypeId))
  if (feedbackOnly) params.set('feedback_only', '1')
  const endpoint = params.toString() ? `/expert/tasks?${params.toString()}` : '/expert/tasks'
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
  await apiRequest('/expert/start-task', {
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

export const sendDailyReportNow = async () => {
  return apiRequest<{ success?: boolean; email_status?: 'sent' | 'failed' | 'skipped'; email_error?: string; message?: string }>('/expert/send-daily-report', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
