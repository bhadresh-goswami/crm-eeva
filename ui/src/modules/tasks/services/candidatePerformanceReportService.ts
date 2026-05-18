import { apiRequest } from '../../../api/client'

export type CandidatePerformanceFilters = {
  candidate_id?: string
  client_id?: string
  from_date?: string
  to_date?: string
  search?: string
  page?: number
  limit?: number
}

export type CandidatePerformanceRow = {
  candidate_id: number | string
  candidate_name: string
  company_name: string
  total_interviews: number
  completed_count: number
  success_count: number
  rejected_count: number
  overall_score?: number | string | null
  success_percentage: number
}

export type CandidateDetailRow = {
  task_id: number | string
  company_name: string
  technical_expert: string
  task_type: string
  task_status: string
  interview_date: string
  est_time?: string
  duration: string
  feedback_status: string
  overall_score?: number | string
  feedback_id?: number | string | null
}

export type CandidateFeedbackData = {
  interview_round?: string
  company_name?: string
  interviewer_name?: string
  communication?: number | string
  technical?: number | string
  confidence?: number | string
  project_explanation?: number | string
  read_proper?: number | string
  area_of_improvements?: string
  recording_url?: string
  overall?: number | string
}

type RowsResponse<T> = { data?: { rows?: T[] } }
type ItemResponse<T> = { data?: T }

export const getCandidatePerformance = async (params: CandidatePerformanceFilters = {}) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  const search = searchParams.toString()
  return apiRequest<RowsResponse<CandidatePerformanceRow>>(`/reports/candidate-performance${search ? `?${search}` : ''}`)
}

export const getCandidatePerformanceDetails = async (candidateId: number | string) => apiRequest<RowsResponse<CandidateDetailRow>>(`/reports/candidate-performance-details?candidate_id=${candidateId}`)

export const getCandidatePerformanceFeedback = async (feedbackId: number | string) => apiRequest<ItemResponse<CandidateFeedbackData>>(`/reports/candidate-performance-feedback?feedback_id=${feedbackId}`)
