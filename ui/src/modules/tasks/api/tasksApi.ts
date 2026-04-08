import { apiRequest } from '../../../api/client'

export type TaskRecord = {
  id: number
  client_id: number | null
  client: string
  candidate: string
  poc: string
  task_type_id: number | null
  task_type: string
  title: string
  description: string
  due_date: string
  time_start: string
  time_end: string
  total_amount: number
  payment_mode: string
  status: string
  assigned_to_id: number | null
  assigned_to_name: string
  file_url: string
  can_assign: boolean
}

export type TaskPayload = {
  id?: number
  client_id: number
  candidate: string
  poc: string
  task_type_id: number
  title: string
  description: string
  due_date: string
  time_start: string
  time_end: string
  total_amount: number
  payment_mode: string
}

export type ExpertRecord = {
  id: number
  name: string
}

type UnknownMap = Record<string, unknown>

const getList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const payload = value as UnknownMap
  const keys = ['data', 'tasks', 'list', 'rows', 'items', 'payload', 'result', 'experts']

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key] as unknown[]
    }
  }

  for (const key of keys) {
    const nested = payload[key]
    if (nested && typeof nested === 'object') {
      const parsed = getList(nested)
      if (parsed.length) return parsed
    }
  }

  return []
}

const asNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeTask = (raw: UnknownMap): TaskRecord => ({
  id: asNumber(raw.id ?? raw.task_id),
  client_id: asNullableNumber(raw.client_id),
  client: String(raw.client ?? raw.client_name ?? raw.company ?? '').trim(),
  candidate: String(raw.candidate ?? raw.candidate_name ?? '').trim(),
  poc: String(raw.poc ?? raw.point_of_contact ?? '').trim(),
  task_type_id: asNullableNumber(raw.task_type_id),
  task_type: String(raw.task_type ?? raw.task_type_name ?? '').trim(),
  title: String(raw.title ?? raw.task_title ?? '').trim(),
  description: String(raw.description ?? '').trim(),
  due_date: String(raw.due_date ?? raw.date ?? '').trim(),
  time_start: String(raw.time_start ?? raw.start_time ?? '').trim(),
  time_end: String(raw.time_end ?? raw.end_time ?? '').trim(),
  total_amount: asNumber(raw.total_amount ?? raw.amount),
  payment_mode: String(raw.payment_mode ?? '').trim(),
  status: String(raw.status ?? 'pending').trim().toLowerCase(),
  assigned_to_id: asNullableNumber(raw.assigned_to_id ?? raw.expert_id),
  assigned_to_name: String(raw.assigned_to_name ?? raw.assigned_to ?? raw.expert_name ?? '').trim(),
  file_url: String(raw.file ?? raw.file_url ?? raw.attachment ?? '').trim(),
  can_assign: raw.can_assign === undefined ? true : Boolean(raw.can_assign),
})

export const getTasks = async () => {
  const response = await apiRequest<unknown>('/tasks/list')

  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeTask(item as UnknownMap) : null))
    .filter((item): item is TaskRecord => Boolean(item?.id))
}

export const createTask = async (payload: TaskPayload) => {
  await apiRequest('/tasks/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const updateTask = async (payload: TaskPayload & { id: number }) => {
  await apiRequest('/tasks/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const deleteTask = async (id: number) => {
  await apiRequest('/tasks/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

const normalizeExpert = (raw: UnknownMap): ExpertRecord => ({
  id: asNumber(raw.id ?? raw.user_id ?? raw.expert_id),
  name: String(raw.name ?? raw.expert_name ?? raw.full_name ?? '').trim(),
})

export const getExperts = async () => {
  const response = await apiRequest<unknown>('/dashboard/experts')

  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeExpert(item as UnknownMap) : null))
    .filter((item): item is ExpertRecord => Boolean(item?.id && item.name))
}

export const assignTask = async (payload: { task_id: number; expert_id: number; reason?: string }) => {
  await apiRequest('/tasks/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
