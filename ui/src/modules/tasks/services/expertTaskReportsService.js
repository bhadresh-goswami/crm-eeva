import { apiRequest } from '../../../api/client'

export const loadTaskForFeedback = async (payload) => {
  const response = await apiRequest('/tasks/load-task-for-feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data ?? { items: [], pagination: { current_page: 1, total_pages: 1, total_records: 0, per_page: 10 } }
}

export const submitFeedback = async (payload) => apiRequest('/feedback', {
  method: 'POST',
  body: JSON.stringify(payload),
})

export const viewFeedback = async (taskId) => apiRequest(`/feedback/${taskId}`)
