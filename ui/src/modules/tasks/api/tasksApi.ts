import { apiRequest } from '../../../api/client'
const FILE_BASE_URL = 'https://support.bsquareg-developers.com/supporting-document'

export type TaskRecord = {
  id: number
  client_id: number | null
  client: string
  candidate: string
  candidate_id: number | null
  poc: string
  poc_id: number | null
  task_type_id: number | null
  task_type: string
  title: string
  description: string
  due_date: string
  time_start: string
  time_end: string
  duration: number
  total_amount: number
  payment_mode: string
  payment_status: string
  status: string
  assigned_to_id: number | null
  assigned_to_name: string
  file_url: string
  can_assign: boolean
}

export type TaskPayload = {
  id?: number
  client_id: number
  poc_id: number
  candidate_id: number
  task_type_id: number
  title: string
  description: string
  due_date: string
  start_time: string
  end_time: string
  duration: number
  total_amount: number
  payment_mode: string
  attachment?: File | null
}

export type ExpertRecord = {
  id: number
  name: string
}

export type CandidateOption = {
  id: number
  name: string
}

export type PocOption = {
  id: number
  name: string
}

export type TaskTypeOption = {
  id: number
  name: string
}

type UnknownMap = Record<string, unknown>

const getList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const payload = value as UnknownMap
  const keys = ['data', 'tasks', 'list', 'rows', 'items', 'payload', 'result', 'experts', 'pocs', 'candidates', 'task_types']

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
  candidate_id: asNullableNumber(raw.candidate_id),
  poc: String(raw.poc ?? raw.point_of_contact ?? raw.poc_name ?? '').trim(),
  poc_id: asNullableNumber(raw.poc_id),
  task_type_id: asNullableNumber(raw.task_type_id),
  task_type: String(raw.task_type ?? raw.task_type_name ?? '').trim(),
  title: String(raw.title ?? raw.task_title ?? '').trim(),
  description: String(raw.description ?? '').trim(),
  due_date: String(raw.due_date ?? raw.date ?? '').trim(),
  time_start: String(raw.time_start ?? raw.start_time ?? raw.startTime ?? raw.from_time ?? raw.time_from ?? '').trim(),
  time_end: String(raw.time_end ?? raw.end_time ?? raw.endTime ?? raw.to_time ?? raw.time_to ?? '').trim(),
  duration: asNumber(raw.duration),
  total_amount: asNumber(raw.total_amount ?? raw.amount),
  payment_mode: String(raw.payment_mode ?? '').trim(),
  payment_status: String(raw.payment_status ?? 'pending').trim().toLowerCase(),
  status: String(raw.status ?? 'pending').trim().toLowerCase(),
  assigned_to_id: asNullableNumber(raw.assigned_to_id ?? raw.expert_id),
  assigned_to_name: String(raw.assigned_to_name ?? raw.assigned_to ?? raw.expert_name ?? '').trim(),
  file_url: (() => {
    const value = String(raw.file ?? raw.file_url ?? raw.attachment ?? raw.attachment_url ?? raw.uploaded_file ?? '').trim()
    if (!value) return ''
    if (value.startsWith('http://') || value.startsWith('https://')) return value
    return `${FILE_BASE_URL}/${value}`
  })(),
  can_assign: raw.can_assign === undefined ? true : Boolean(raw.can_assign),
})

export const getTasks = async () => {
  const response = await apiRequest<unknown>('/tasks/list')

  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeTask(item as UnknownMap) : null))
    .filter((item): item is TaskRecord => Boolean(item?.id))
}

export const createTask = async (payload: TaskPayload) => {
  await submitTask('/tasks/create', payload)
}

export const updateTask = async (payload: TaskPayload & { id: number }) => {
  await submitTask('/tasks/update', payload)
}

const submitTask = async (path: '/tasks/create' | '/tasks/update', payload: TaskPayload & { id?: number }) => {
  const formData = new FormData()
  if (payload.id) formData.append('task_id', String(payload.id))
  formData.append('client_id', String(payload.client_id))
  formData.append('poc_id', String(payload.poc_id))
  formData.append('candidate_id', String(payload.candidate_id))
  formData.append('task_type_id', String(payload.task_type_id))
  formData.append('title', payload.title)
  formData.append('description', payload.description)
  formData.append('due_date', payload.due_date)
  formData.append('start_time', payload.start_time)
  formData.append('end_time', payload.end_time)
  formData.append('duration', String(payload.duration))
  formData.append('total_amount', String(payload.total_amount))
  formData.append('payment_mode', payload.payment_mode)
  if (payload.attachment) {
    formData.append('files[]', payload.attachment)
  }

  try {
    await apiRequest(path, {
      method: 'POST',
      body: formData,
    })
  } catch {
    const fallback = {
      ...(payload.id ? { task_id: payload.id } : {}),
      client_id: payload.client_id,
      poc_id: payload.poc_id,
      candidate_id: payload.candidate_id,
      task_type_id: payload.task_type_id,
      title: payload.title,
      description: payload.description,
      due_date: payload.due_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      duration: payload.duration,
      total_amount: payload.total_amount,
      payment_mode: payload.payment_mode,
    }
    await apiRequest(path, {
      method: 'POST',
      body: JSON.stringify(fallback),
    })
  }
}

export const uploadTaskAttachment = async (file: File) => {
  const formData = new FormData()
  formData.append('files[]', file)
  const response = await apiRequest<Record<string, unknown>>('/tasks/upload', {
    method: 'POST',
    body: formData,
  })

  const nested = response.data && typeof response.data === 'object' ? (response.data as Record<string, unknown>) : null
  const path = String(response.file_path ?? response.path ?? response.url ?? nested?.file_path ?? nested?.path ?? '').trim()

  if (!path) {
    throw new Error('Upload endpoint did not return file path')
  }

  return path
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

export const assignTask = async (payload: { task_id: number; user_id: number; reason?: string }) => {
  await apiRequest('/tasks/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

const normalizeCandidate = (raw: UnknownMap): CandidateOption => ({
  id: asNumber(raw.id ?? raw.candidate_id),
  name: String(raw.name ?? raw.candidate_name ?? '').trim(),
})

export const getCandidatesByClient = async (clientId: number) => {
  const response = await apiRequest<unknown>('/candidates/list')
  const rawList = getList(response).filter((item): item is UnknownMap => Boolean(item && typeof item === 'object'))
  return rawList
    .filter((item) => asNumber(item.client_id) === clientId)
    .map(normalizeCandidate)
    .filter((item): item is CandidateOption => Boolean(item?.id && item.name))
}

const normalizePoc = (raw: UnknownMap): PocOption => ({
  id: asNumber(raw.id ?? raw.poc_id),
  name: String(raw.name ?? raw.poc_name ?? '').trim(),
})

export const getPocsByClient = async (clientId: number) => {
  const response = await apiRequest<unknown>('/pocs/list')
  const rawList = getList(response).filter((item): item is UnknownMap => Boolean(item && typeof item === 'object'))
  return rawList
    .filter((item) => asNumber(item.client_id) === clientId)
    .map(normalizePoc)
    .filter((item): item is PocOption => Boolean(item?.id && item.name))
}

const normalizeTaskType = (raw: UnknownMap): TaskTypeOption | null => {
  const status = String(raw.status ?? raw.is_active ?? '').trim().toLowerCase()
  const isActive = status === '' || status === '1' || status === 'active' || status === 'true'
  if (!isActive) return null

  const id = asNumber(raw.id ?? raw.task_type_id)
  const name = String(raw.name ?? raw.task_type ?? raw.title ?? '').trim()
  return id && name ? { id, name } : null
}

export const getTaskTypes = async () => {
  const response = await apiRequest<unknown>('/task-types/list')
  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeTaskType(item as UnknownMap) : null))
    .filter((item): item is TaskTypeOption => Boolean(item))
}
