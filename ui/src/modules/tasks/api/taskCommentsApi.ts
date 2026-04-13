import { apiRequest } from '../../../api/client'

export type TaskCommentItem = {
  id: number
  task_id: number
  user_id: number
  user_name: string
  comment: string
  created_at: string
}

const asTaskComment = (item: Record<string, unknown>): TaskCommentItem => ({
  id: Number(item.id ?? 0),
  task_id: Number(item.task_id ?? 0),
  user_id: Number(item.user_id ?? 0),
  user_name: String(item.user_name ?? '').trim(),
  comment: String(item.comment ?? '').trim(),
  created_at: String(item.created_at ?? '').trim(),
})

export const getTaskComments = async (taskId: number) => {
  const response = await apiRequest<{ comments?: unknown[] }>(`/tasks/comments?task_id=${taskId}`)
  const comments = Array.isArray(response?.comments) ? response.comments : []
  return comments
    .map((item) => (item && typeof item === 'object' ? asTaskComment(item as Record<string, unknown>) : null))
    .filter((item): item is TaskCommentItem => Boolean(item && item.id > 0))
}
