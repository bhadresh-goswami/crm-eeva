import { apiRequest } from '../../../api/client'

type CandidatePerformanceFilters = {
  candidate_id?: string
  client_id?: string
  from_date?: string
  to_date?: string
  search?: string
  page?: number
  limit?: number
}

export const getCandidatePerformance = async (params: CandidatePerformanceFilters = {}) => {
  const search = new URLSearchParams(params as Record<string, string>).toString()
  return apiRequest(`/reports/candidate-performance${search ? `?${search}` : ''}`)
}

export const getCandidatePerformanceDetails = async (candidateId: number | string) => apiRequest(`/reports/candidate-performance-details?candidate_id=${candidateId}`)

export const getCandidatePerformanceFeedback = async (feedbackId: number | string) => apiRequest(`/reports/candidate-performance-feedback?feedback_id=${feedbackId}`)
