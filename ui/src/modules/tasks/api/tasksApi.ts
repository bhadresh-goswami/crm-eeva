import { apiFetch, apiRequest } from '../../../api/client'
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
  resume_url: string
  can_assign: boolean
  task_start_time?: string
  task_end_time?: string
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

type TaskQuery = {
  status?: string
  excludeStatus?: string
}

export type TaskUpdateCheck = {
  newTasks: TaskRecord[]
  upcomingTasks: TaskRecord[]
}

export type TaskFilterOptions = {
  companies: string[]
  statuses: string[]
  assignees: { id: number; name: string }[]
  task_types: { id: number; name: string }[]
  candidates: { id: number; name: string }[]
}

export const getTasksLastUpdate = async (): Promise<string | null> => {
  const response = await apiRequest<Record<string, unknown>>('/tasks/last-update')
  const value = String(response.last_update ?? '').trim()
  return value || null
}

export const getTaskFilterOptions = async (): Promise<TaskFilterOptions> => {
  const response = await apiRequest<Record<string, unknown>>('/tasks/filter-options')
  const data = (response.data && typeof response.data === 'object' ? response.data : {}) as Record<string, unknown>
  return {
    companies: Array.isArray(data.companies) ? data.companies.map((v) => String(v).trim()).filter(Boolean) : [],
    statuses: Array.isArray(data.statuses) ? data.statuses.map((v) => String(v).trim().toLowerCase()).filter(Boolean) : [],
    assignees: Array.isArray(data.assignees) ? data.assignees.map((row) => ({ id: Number((row as Record<string, unknown>).id ?? 0), name: String((row as Record<string, unknown>).name ?? '').trim() })).filter((row) => row.id > 0 && row.name) : [],
    task_types: Array.isArray(data.task_types) ? data.task_types.map((row) => ({ id: Number((row as Record<string, unknown>).id ?? 0), name: String((row as Record<string, unknown>).name ?? '').trim() })).filter((row) => row.id > 0 && row.name) : [],
    candidates: Array.isArray(data.candidates) ? data.candidates.map((row) => ({ id: Number((row as Record<string, unknown>).id ?? 0), name: String((row as Record<string, unknown>).name ?? '').trim() })).filter((row) => row.id > 0 && row.name) : [],
  }
}

export type BulkPriceTaskRecord = {
  id: number
  description: string
  created_at: string
  due_date: string
  candidate_name: string
  company_name: string
  status: string
  assigned_to_name: string
  start_time: string
  end_time: string
  total_amount: number
  support_type: string
  invoice_status: string
  paid_amount: number
  pending_amount: number
}

export type BulkPriceListResponse = {
  tasks: BulkPriceTaskRecord[]
  summary: {
    total_pending_tasks: number
    total_pending_amount: number
  }
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
  client: String(raw.client ?? raw.company_name ?? raw.client_name ?? raw.company ?? '').trim(),
  candidate: String(raw.candidate ?? raw.candidate_name ?? '').trim(),
  candidate_id: asNullableNumber(raw.candidate_id),
  poc: String(raw.poc ?? raw.point_of_contact ?? raw.poc_name ?? '').trim(),
  poc_id: asNullableNumber(raw.poc_id),
  task_type_id: asNullableNumber(raw.task_type_id),
  task_type: String(raw.task_type ?? raw.task_type_name ?? '').trim(),
  title: String(raw.title ?? raw.task_title ?? '').trim(),
  description: String(raw.description ?? raw.task_description ?? raw.desc ?? '').trim(),
  due_date: String(raw.due_date ?? raw.date ?? raw.created_at ?? '').trim(),
  time_start: String(raw.time_start ?? raw.task_start_time ?? raw.start_time ?? raw.startTime ?? raw.from_time ?? raw.time_from ?? '').trim(),
  time_end: String(raw.time_end ?? raw.task_end_time ?? raw.end_time ?? raw.endTime ?? raw.to_time ?? raw.time_to ?? '').trim(),
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
  resume_url: (() => {
    const value = String(raw.resume_url ?? raw.resume ?? raw.candidate_resume ?? raw.cv_url ?? '').trim()
    if (!value) return ''
    if (value.startsWith('http://') || value.startsWith('https://')) return value
    return `${FILE_BASE_URL}/${value}`
  })(),
  can_assign: raw.can_assign === undefined ? true : Boolean(raw.can_assign),
})

export const getTasks = async (query: TaskQuery = {}) => {
  const searchParams = new URLSearchParams()
  if (query.status) searchParams.set('status', query.status)
  if (query.excludeStatus) searchParams.set('status_ne', query.excludeStatus)
  const endpoint = searchParams.toString() ? `/tasks/list?${searchParams.toString()}` : '/tasks/list'
  const response = await apiRequest<unknown>(endpoint)

  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeTask(item as UnknownMap) : null))
    .filter((item): item is TaskRecord => Boolean(item?.id))
}

export const checkTaskUpdates = async (sinceId = 0, windowMinutes = 30): Promise<TaskUpdateCheck> => {
  const params = new URLSearchParams()
  if (sinceId > 0) params.set('since_id', String(sinceId))
  params.set('window_minutes', String(windowMinutes))

  const response = await apiRequest<Record<string, unknown>>(`/tasks/check-updates?${params.toString()}`)

  const newTasks = getList(response.new_tasks ?? response.newTasks)
    .map((item) => (item && typeof item === 'object' ? normalizeTask(item as UnknownMap) : null))
    .filter((item): item is TaskRecord => Boolean(item?.id))

  const upcomingTasks = getList(response.upcoming_tasks ?? response.upcomingTasks)
    .map((item) => (item && typeof item === 'object' ? normalizeTask(item as UnknownMap) : null))
    .filter((item): item is TaskRecord => Boolean(item?.id))

  return { newTasks, upcomingTasks }
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
  if (payload.poc_id > 0) formData.append('poc_id', String(payload.poc_id))
  if (payload.candidate_id > 0) formData.append('candidate_id', String(payload.candidate_id))
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
    const response = await apiRequest<Record<string, unknown>>(path, {
      method: 'POST',
      body: formData,
    })
    throwIfApiError(response)
    return
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      const shouldFallback =
        (!payload.attachment && path === '/tasks/update') ||
        error.message.includes('415') ||
        error.message.includes('Unsupported Media Type') ||
        error.message.includes('Cannot parse') ||
        error.message.includes('multipart')

      if (!shouldFallback) {
        throw error
      }
    }

    const fallback = {
      ...(payload.id ? { task_id: payload.id } : {}),
      client_id: payload.client_id,
      ...(payload.poc_id > 0 ? { poc_id: payload.poc_id } : {}),
      ...(payload.candidate_id > 0 ? { candidate_id: payload.candidate_id } : {}),
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
    const fallbackResponse = await apiRequest<Record<string, unknown>>(path, {
      method: 'POST',
      body: JSON.stringify(fallback),
    })
    throwIfApiError(fallbackResponse)
    return
  }
}

const throwIfApiError = (response: Record<string, unknown> | undefined) => {
  if (!response || typeof response !== 'object') return

  const success = response.success
  if (typeof success === 'boolean' && !success) {
    const message = String(response.message ?? response.error ?? 'Request failed').trim()
    throw new Error(message || 'Request failed')
  }

  const error = String(response.error ?? '').trim()
  if (error) {
    throw new Error(error)
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
  return apiRequest<{ success?: boolean; email_status?: 'sent' | 'failed'; email_error?: string; message?: string }>('/tasks/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const bulkAssignTasks = async (payload: { task_ids: number[]; user_id: number }) => {
  await apiRequest('/tasks/bulk-assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const bulkCancelTasks = async (taskIds: number[]) => {
  await apiRequest('/tasks/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ task_ids: taskIds, status: 'Cancelled' }),
  })
}

export const cancelTask = async (taskId: number) => {
  await apiRequest('/tasks/cancel', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId }),
  })
}

export const moveTaskToPending = async (taskId: number) => {
  await apiRequest('/tasks/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ task_ids: [taskId], status: 'Pending' }),
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

const normalizeBulkPriceTask = (raw: UnknownMap): BulkPriceTaskRecord => ({
  id: asNumber(raw.id ?? raw.task_id),
  description: String(raw.description ?? raw.title ?? '').trim(),
  created_at: String(raw.created_at ?? raw.date ?? '').trim(),
  due_date: String(raw.due_date ?? '').trim(),
  candidate_name: String(raw.candidate_name ?? '').trim(),
  company_name: String(raw.company_name ?? raw.client_name ?? '').trim(),
  status: String(raw.status ?? '').trim().toLowerCase(),
  assigned_to_name: String(raw.assigned_to_name ?? '').trim(),
  start_time: String(raw.start_time ?? '').trim(),
  end_time: String(raw.end_time ?? '').trim(),
  total_amount: asNumber(raw.total_amount ?? 0),
  support_type: String(raw.support_type ?? '').trim(),
  invoice_status: String(raw.invoice_status ?? '').trim().toLowerCase(),
  paid_amount: asNumber(raw.paid_amount ?? 0),
  pending_amount: asNumber(raw.pending_amount ?? raw.total_amount ?? 0),
})

export const getBulkPriceTasks = async (query: { from_date?: string; to_date?: string; client_id?: number; search?: string } = {}): Promise<BulkPriceListResponse> => {
  const params = new URLSearchParams()
  if (query.from_date) params.set('from_date', query.from_date)
  if (query.to_date) params.set('to_date', query.to_date)
  if (query.client_id) params.set('client_id', String(query.client_id))
  if (query.search) params.set('search', query.search)

  const endpoint = params.toString() ? `/tasks/bulk-price?${params.toString()}` : '/tasks/bulk-price'
  try {
    const response = await apiFetch(endpoint, { method: 'GET' })
    if (response.ok) {
      const payload = (await response.json()) as unknown
      const tasks = getList(payload)
        .map((item) => (item && typeof item === 'object' ? normalizeBulkPriceTask(item as UnknownMap) : null))
        .filter((item): item is BulkPriceTaskRecord => Boolean(item?.id))

      const typedPayload = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
      const rawSummary = typedPayload.summary && typeof typedPayload.summary === 'object'
        ? (typedPayload.summary as Record<string, unknown>)
        : {}

      return {
        tasks,
        summary: {
          total_pending_tasks: asNumber(rawSummary.total_pending_tasks ?? tasks.length),
          total_pending_amount: asNumber(rawSummary.total_pending_amount ?? tasks.reduce((sum, row) => sum + row.pending_amount, 0)),
        },
      }
    }

    if (response.status !== 404) {
      const message = await response.text()
      throw new Error(message || `Request failed with status ${response.status}`)
    }

    // 404 fallback for environments that have not yet deployed /tasks/bulk-price route
    const fallbackTasks = await getTasks()
    const searchTerm = (query.search ?? '').trim().toLowerCase()
    const tasks = fallbackTasks
      .filter((task) => ['completed', 'cancelled'].includes(task.status))
      .filter((task) => task.total_amount === 0)
      .filter((task) => task.payment_status !== 'paid')
      .filter((task) => (query.client_id ? task.client_id === query.client_id : true))
      .filter((task) => (query.from_date ? task.due_date.slice(0, 10) >= query.from_date : true))
      .filter((task) => (query.to_date ? task.due_date.slice(0, 10) <= query.to_date : true))
      .filter((task) => {
        if (!searchTerm) return true
        return [task.candidate, task.client, task.task_type].some((value) => value.toLowerCase().includes(searchTerm))
      })
      .map((task) => ({
        id: task.id,
        description: task.description || task.title,
        created_at: task.due_date,
        due_date: task.due_date,
        candidate_name: task.candidate,
        company_name: task.client,
        status: task.status,
        assigned_to_name: task.assigned_to_name,
        start_time: task.time_start,
        end_time: task.time_end,
        total_amount: task.total_amount,
        support_type: task.task_type,
        invoice_status: '',
        paid_amount: 0,
        pending_amount: task.total_amount,
      }))
    return {
      tasks,
      summary: {
        total_pending_tasks: tasks.length,
        total_pending_amount: tasks.reduce((sum, row) => sum + row.pending_amount, 0),
      },
    }
  } catch (error) {
    if (error instanceof Error && !error.message.toLowerCase().includes('route not found')) {
      throw error
    }
    const fallbackTasks = await getTasks()
    const tasks = fallbackTasks
      .filter((task) => ['completed', 'cancelled'].includes(task.status))
      .filter((task) => task.total_amount === 0)
      .map((task) => ({
        id: task.id,
        description: task.description || task.title,
        created_at: task.due_date,
        due_date: task.due_date,
        candidate_name: task.candidate,
        company_name: task.client,
        status: task.status,
        assigned_to_name: task.assigned_to_name,
        start_time: task.time_start,
        end_time: task.time_end,
        total_amount: task.total_amount,
        support_type: task.task_type,
        invoice_status: '',
        paid_amount: 0,
        pending_amount: task.total_amount,
      }))
    return {
      tasks,
      summary: {
        total_pending_tasks: tasks.length,
        total_pending_amount: tasks.reduce((sum, row) => sum + row.pending_amount, 0),
      },
    }
  }
}

export const updateTaskPrices = async (updates: Array<{ task_id: number; amount: number }>) => {
  return apiRequest<{ updated_count?: number; success?: boolean; message?: string }>('/tasks/bulk-price/update', {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}

export const getTaskReport = async (query: {
  status?: string
  from_date?: string
  to_date?: string
  client_id?: number
  candidate_id?: number
  assigned_user_id?: number
  task_type_id?: number
} = {}) => {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.from_date) params.set('from_date', query.from_date)
  if (query.to_date) params.set('to_date', query.to_date)
  if (query.client_id) params.set('client_id', String(query.client_id))
  if (query.candidate_id) params.set('candidate_id', String(query.candidate_id))
  if (query.assigned_user_id) params.set('assigned_user_id', String(query.assigned_user_id))
  if (query.task_type_id) params.set('task_type_id', String(query.task_type_id))
  const endpoint = params.toString() ? `/reports/tasks?${params.toString()}` : '/reports/tasks'
  const response = await apiRequest<unknown>(endpoint)
  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeTask(item as UnknownMap) : null))
    .filter((item): item is TaskRecord => Boolean(item?.id))
}

export type TaskAssignmentReportRow = {
  task_id: number
  assigned_to_name: string
  created_at: string
  status: string
}

export const getTaskAssignmentReport = async (query: {
  status?: string
  from_date?: string
  to_date?: string
} = {}) => {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.from_date) params.set('from_date', query.from_date)
  if (query.to_date) params.set('to_date', query.to_date)

  const endpoint = params.toString() ? `/reports/task-assignments?${params.toString()}` : '/reports/task-assignments'
  const response = await apiRequest<unknown>(endpoint)

  return getList(response)
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as UnknownMap
      return {
        task_id: asNumber(row.task_id ?? row.id),
        assigned_to_name: String(row.assigned_to_name ?? '').trim(),
        created_at: String(row.created_at ?? row.date ?? '').trim(),
        status: String(row.status ?? '').trim().toLowerCase(),
      } as TaskAssignmentReportRow
    })
    .filter((item): item is TaskAssignmentReportRow => Boolean(item?.task_id))
}
