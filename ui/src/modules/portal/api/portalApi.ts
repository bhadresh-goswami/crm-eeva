import { apiRequest } from '../../../api/client'

export type PortalTask = {
  id: number
  title: string
  description: string
  due_date: string
  start_time: string
  end_time: string
  created_at: string
  total_amount: number
  status_name: string
  task_type: string
  client_name: string
  company_name: string
  candidate_name: string
  poc_name: string
}

export type PortalComment = {
  id: number
  comment: string
  created_at: string
  user_name: string
}

export type PortalFile = {
  id: number
  file_url: string
  uploaded_by: string
  created_at: string
}

type ApiEnvelope<TData> = {
  success?: boolean
  data?: TData
  message?: string
}

type PaginatedEnvelope<TData> = ApiEnvelope<TData> & {
  meta?: {
    page?: number
    per_page?: number
    total?: number
    total_pages?: number
  }
}

export type PortalSummary = {
  summary: {
    total_tasks: number
    completed_tasks: number
    open_tasks: number
    total_amount: number
  }
  recent_tasks: PortalTask[]
}

export type PortalFilters = {
  statuses: string[]
  task_types: string[]
}

export type PortalTaskQuery = {
  page: number
  per_page: number
  search?: string
  status?: string
  task_type?: string
  date_from?: string
  date_to?: string
}

export type PortalTaskList = {
  data: PortalTask[]
  meta: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

const unwrap = <TData>(response: ApiEnvelope<TData>, fallback: TData): TData => {
  if (response.success === false) {
    throw new Error(response.message || 'Request failed.')
  }
  return response.data ?? fallback
}

const mapTask = (raw: Partial<PortalTask>): PortalTask => ({
  id: Number(raw.id ?? 0),
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  due_date: String(raw.due_date ?? ''),
  start_time: String(raw.start_time ?? ''),
  end_time: String(raw.end_time ?? ''),
  created_at: String(raw.created_at ?? ''),
  total_amount: Number(raw.total_amount ?? 0),
  status_name: String(raw.status_name ?? ''),
  task_type: String(raw.task_type ?? ''),
  client_name: String(raw.client_name ?? ''),
  company_name: String(raw.company_name ?? ''),
  candidate_name: String(raw.candidate_name ?? ''),
  poc_name: String(raw.poc_name ?? ''),
})

const buildQueryString = (query: PortalTaskQuery) => {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('per_page', String(query.per_page))
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.task_type) params.set('task_type', query.task_type)
  if (query.date_from) params.set('date_from', query.date_from)
  if (query.date_to) params.set('date_to', query.date_to)
  return params.toString()
}

export const getPortalSummary = async (): Promise<PortalSummary> => {
  const response = await apiRequest<ApiEnvelope<PortalSummary>>('/portal/summary')
  const data = unwrap(response, {
    summary: { total_tasks: 0, completed_tasks: 0, open_tasks: 0, total_amount: 0 },
    recent_tasks: [],
  })

  return {
    summary: {
      total_tasks: Number(data.summary.total_tasks ?? 0),
      completed_tasks: Number(data.summary.completed_tasks ?? 0),
      open_tasks: Number(data.summary.open_tasks ?? 0),
      total_amount: Number(data.summary.total_amount ?? 0),
    },
    recent_tasks: (data.recent_tasks ?? []).map(mapTask),
  }
}

export const getPortalFilters = async (): Promise<PortalFilters> => {
  const response = await apiRequest<ApiEnvelope<PortalFilters>>('/portal/filter-options')
  const data = unwrap(response, { statuses: [], task_types: [] })
  return {
    statuses: data.statuses ?? [],
    task_types: data.task_types ?? [],
  }
}

export const getPortalTasks = async (query: PortalTaskQuery): Promise<PortalTaskList> => {
  const response = await apiRequest<PaginatedEnvelope<PortalTask[]>>(`/portal/tasks?${buildQueryString(query)}`)
  const rows = unwrap(response, [])
  return {
    data: rows.map(mapTask),
    meta: {
      page: Number(response.meta?.page ?? query.page),
      per_page: Number(response.meta?.per_page ?? query.per_page),
      total: Number(response.meta?.total ?? rows.length),
      total_pages: Number(response.meta?.total_pages ?? 1),
    },
  }
}

export const getPortalTaskDetail = async (id: number): Promise<{ task: PortalTask; comments: PortalComment[]; files: PortalFile[] }> => {
  const response = await apiRequest<ApiEnvelope<{ task?: Partial<PortalTask>; comments?: PortalComment[]; files?: PortalFile[] }>>(`/portal/tasks/detail?id=${id}`)
  const data = unwrap(response, { task: {}, comments: [], files: [] })
  return {
    task: mapTask(data.task ?? {}),
    comments: data.comments ?? [],
    files: data.files ?? [],
  }
}

export const addPortalTaskComment = async (taskId: number, comment: string) => {
  await apiRequest('/portal/tasks/comment', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, comment }),
  })
}
