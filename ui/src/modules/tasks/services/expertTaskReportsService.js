import { apiRequest } from '../../../api/client'

export const loadTaskForFeedback = async (payload) => {
  const params = new URLSearchParams()
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) params.set(k, String(v))
  })
  const response = await apiRequest(`/reports/expert-tasks?${params.toString()}`)
  return response?.data ?? { items: [], task_type_counts: [], pagination: { current_page: 1, total_pages: 1, total_records: 0, per_page: 20 } }
}

export const submitFeedback = async (payload) => apiRequest('/feedback', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const viewFeedback = async (taskId) => apiRequest(`/feedback/${taskId}`)
