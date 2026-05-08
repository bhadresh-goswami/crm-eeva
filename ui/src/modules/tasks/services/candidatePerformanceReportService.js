import { apiRequest } from '../../../api/client'

export const getCandidatePerformance = async (params = {}) => {
  const search = new URLSearchParams(params).toString()
  return apiRequest(`/reports/candidate-performance${search ? `?${search}` : ''}`)
}

export const getCandidatePerformanceDetails = async (candidateId) => apiRequest(`/reports/candidate-performance-details?candidate_id=${candidateId}`)

export const getCandidatePerformanceFeedback = async (feedbackId) => apiRequest(`/reports/candidate-performance-feedback?feedback_id=${feedbackId}`)
