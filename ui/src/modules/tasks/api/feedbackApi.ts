import { apiRequest } from '../../../api/client'

export type FeedbackValue = string | number | null

export type FeedbackPayload = {
  task_id: number
  custom_fields?: Record<string, FeedbackValue>
  [key: string]: FeedbackValue | Record<string, FeedbackValue> | undefined
}

export type FeedbackRecord = Record<string, unknown>

export type FeedbackFieldDefinition = {
  label: string
  type: 'text' | 'rating' | 'select'
  required?: boolean
  min?: number
  max?: number
  storage?: 'column' | 'custom'
  options?: string[]
  section: string
}

export type FeedbackFieldConfiguration = Record<string, FeedbackFieldDefinition>

const additionalFields: FeedbackFieldConfiguration = {
  area_of_improvements: { label: 'Area of Improvements', type: 'text', section: 'Additional Feedback' },
  strengths: { label: 'Strengths', type: 'text', section: 'Strengths' },
  recommendations: { label: 'Recommendations', type: 'text', section: 'Recommendations' },
  next_action: { label: 'Next Action', type: 'text', section: 'Next Action' },
  additional_feedback: { label: 'Additional Feedback', type: 'text', section: 'Additional Feedback' },
  recording_url: { label: 'Recording URL', type: 'text', section: 'Additional Feedback' },
}

const rating = (label: string, section: string, storage: 'column' | 'custom' = 'column'): FeedbackFieldDefinition => ({
  label, type: 'rating', required: true, min: 1, max: 5, storage, section,
})

const configurations: Record<string, FeedbackFieldConfiguration> = {
  'interview support': {
    company_name: { label: 'Company Name', type: 'text', required: true, section: 'Interview Details' },
    interviewer_name: { label: 'Interviewer Name', type: 'text', required: true, section: 'Interview Details' },
    interview_round: { label: 'Interview Round', type: 'text', section: 'Interview Details' },
    communication: rating('Communication', 'Communication Assessment'),
    technical: rating('Technical', 'Technical Assessment'),
    confidence: rating('Confidence', 'Communication Assessment'),
    project_explanation: rating('Project Explanation', 'Technical Assessment'),
    read_proper: { label: 'Read Proper', type: 'select', options: ['Yes', 'No'], section: 'Technical Assessment' },
    ...additionalFields,
  },
  'free counselling': {
    communication: rating('Communication', 'Communication Assessment'),
    career_clarity: rating('Career Clarity', 'Career Assessment', 'custom'),
    confidence: rating('Confidence', 'Communication Assessment'),
    resume_readiness: rating('Resume Readiness', 'Resume Review', 'custom'),
    career_goal_understanding: rating('Career Goal Understanding', 'Career Assessment', 'custom'),
    ...additionalFields,
  },
  jdc: {
    jd_understanding: rating('JD Understanding', 'Technical Assessment', 'custom'),
    role_alignment: rating('Role Alignment', 'Career Assessment', 'custom'),
    ...additionalFields,
  },
  ruc: {
    resume_quality: rating('Resume Quality', 'Resume Review', 'custom'),
    role_alignment: rating('Role Alignment', 'Career Assessment', 'custom'),
    ...additionalFields,
  },
  tac: {
    technical: rating('Core Technical Knowledge', 'Technical Assessment'),
    confidence: rating('Confidence', 'Communication Assessment'),
    role_readiness: rating('Role Readiness', 'Career Assessment', 'custom'),
    ...additionalFields,
  },
  'training session': {
    participation: rating('Participation', 'Training Assessment', 'custom'),
    assignment_completion: rating('Assignment Completion', 'Training Assessment', 'custom'),
    ...additionalFields,
  },
}

const humanize = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export const getFeedbackConfiguration = (taskType: string, apiFields?: unknown): FeedbackFieldConfiguration => {
  if (apiFields && typeof apiFields === 'object' && !Array.isArray(apiFields)) {
    const taskConfiguration = configurations[taskType.trim().toLowerCase()]
    return Object.fromEntries(Object.entries(apiFields as Record<string, Record<string, unknown>>).map(([name, field]) => {
      const definition: FeedbackFieldDefinition = {
        label: String(field.label ?? humanize(name)),
        type: field.type === 'rating' ? 'rating' : field.type === 'select' ? 'select' : 'text',
        required: Boolean(field.required),
        min: Number.isFinite(Number(field.min)) ? Number(field.min) : undefined,
        max: Number.isFinite(Number(field.max)) ? Number(field.max) : undefined,
        storage: taskConfiguration?.[name]?.storage ?? (name in additionalFields ? 'column' : undefined),
        options: name === 'read_proper' ? ['Yes', 'No'] : undefined,
        section: taskConfiguration?.[name]?.section ?? (name in additionalFields ? additionalFields[name].section : 'Assessment'),
      }
      return [name, definition]
    }))
  }
  return configurations[taskType.trim().toLowerCase()] ?? {}
}

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
