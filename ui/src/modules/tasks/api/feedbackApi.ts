import { apiRequest } from '../../../api/client'

export type FeedbackPayload = {
  task_id: number
  company_name: string
  interviewer_name: string
  interview_round: string
  communication: number
  technical: number
  confidence: number
  project_explanation: number
  read_proper: string
  area_of_improvements: string
  recording_url: string
}

export type FeedbackRecord = Record<string, unknown>

export const createFeedback = async (payload: FeedbackPayload) => {
  return apiRequest('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const getFeedbackByTaskId = async (taskId: number) => {
  const response = await apiRequest<{ data?: FeedbackRecord }>(`/feedback/${taskId}`)
  return (response?.data ?? null) as FeedbackRecord | null
}

export const getAllFeedback = async () => {
  const response = await apiRequest<{ data?: FeedbackRecord[] }>('/feedback')
  return Array.isArray(response?.data) ? response.data : []
}
