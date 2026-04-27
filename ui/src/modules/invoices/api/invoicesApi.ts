import { apiRequest } from '../../../api/client'

export type CompletedTask = {
  task_id: number
  id: number
  client_id: number
  client_name: string
  company_name: string
  client_phone: string
  client_email: string
  support_type: string
  amount: number
  due_date: string
}

type UnknownMap = Record<string, unknown>

const getList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const payload = value as UnknownMap
  const keys = ['data', 'items', 'rows', 'list', 'result', 'payload']

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key] as unknown[]
  }

  for (const key of keys) {
    const nested = payload[key]
    if (nested && typeof nested === 'object') {
      const found = getList(nested)
      if (found.length) return found
    }
  }

  return []
}

const normalizeTask = (raw: UnknownMap): CompletedTask => ({
  task_id: Number(raw.task_id ?? raw.id ?? 0),
  id: Number(raw.id ?? raw.task_id ?? 0),
  client_id: Number(raw.client_id ?? 0),
  client_name: String(raw.client_name ?? '').trim(),
  company_name: String(raw.company_name ?? '').trim(),
  client_phone: String(raw.client_phone ?? raw.phone ?? '').trim(),
  client_email: String(raw.client_email ?? raw.email ?? '').trim(),
  support_type: String(raw.support_type ?? raw.task_type ?? 'Support').trim(),
  amount: Number(raw.amount ?? raw.total_amount ?? 0),
  due_date: String(raw.due_date ?? '').trim(),
})

export const getCompletedTasks = async (query: { client_id: number; from_date: string; to_date: string }) => {
  const params = new URLSearchParams({
    client_id: String(query.client_id),
    from_date: query.from_date,
    to_date: query.to_date,
  })

  const response = await apiRequest<unknown>(`/tasks/completed?${params.toString()}`)

  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeTask(item as UnknownMap) : null))
    .filter((item): item is CompletedTask => Boolean(item?.task_id))
}

export const getNextInvoiceNumber = async () => {
  const response = await apiRequest<{ data?: { invoice_number?: string } }>('/invoices/next-number')
  return String(response?.data?.invoice_number ?? '').trim()
}

export type CreateInvoicePayload = {
  client_id: number
  from_date: string
  to_date: string
  currency: string
  invoice_number: string
  invoice_date: string
  payment_due_date: string
  notes: string
  subtotal: number
  tds_amount: number
  total_amount: number
  tds?: number
  total?: number
  grouped_items: Array<{ support_type: string; qty: number; amount: number; task_ids: number[] }>
  items: Array<{ task_id: number; qty: number; support_type: string; amount: number; status: 'pending' | 'paid' }>
}

export const createInvoice = async (payload: CreateInvoicePayload) => {
  return apiRequest('/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type InvoiceRecord = {
  id: number
  invoice_number: string
  client_id: number
  client_name: string
  company_name: string
  from_date: string
  to_date: string
  total_amount: number
  status: string
  created_at: string
}

export type InvoiceItemRecord = {
  id: number
  invoice_id: number
  task_id: number
  support_type: string
  amount: number
  status: 'not_paid' | 'paid' | 'settled'
  title: string
  due_date: string
}

export type InvoiceDetailRecord = {
  id: number
  invoice_number: string
  client_id: number
  client_name: string
  company_name: string
  from_date: string
  to_date: string
  total_amount: number
  status: 'pending' | 'partial' | 'paid'
  created_at: string
  items: InvoiceItemRecord[]
}

const normalizeInvoice = (raw: UnknownMap): InvoiceRecord => ({
  id: Number(raw.id ?? 0),
  invoice_number: String(raw.invoice_number ?? '').trim(),
  client_id: Number(raw.client_id ?? 0),
  client_name: String(raw.client_name ?? '').trim(),
  company_name: String(raw.company_name ?? '').trim(),
  from_date: String(raw.from_date ?? '').trim(),
  to_date: String(raw.to_date ?? '').trim(),
  total_amount: Number(raw.total_amount ?? 0),
  status: String(raw.status ?? 'pending').trim().toLowerCase(),
  created_at: String(raw.created_at ?? '').trim(),
})

const normalizeInvoiceItem = (raw: UnknownMap): InvoiceItemRecord => {
  const rawStatus = String(raw.status ?? 'not_paid').trim().toLowerCase()
  const status: InvoiceItemRecord['status'] = rawStatus === 'paid' || rawStatus === 'settled' ? rawStatus : 'not_paid'

  return {
    id: Number(raw.id ?? 0),
    invoice_id: Number(raw.invoice_id ?? 0),
    task_id: Number(raw.task_id ?? 0),
    support_type: String(raw.support_type ?? 'Support').trim(),
    amount: Number(raw.amount ?? 0),
    status,
    title: String(raw.title ?? '').trim(),
    due_date: String(raw.due_date ?? '').trim(),
  }
}

export const getInvoices = async (query: {
  client_id?: number
  from_date?: string
  to_date?: string
  status?: string
  invoice_number?: string
} = {}) => {
  const params = new URLSearchParams()
  if (query.client_id) params.set('client_id', String(query.client_id))
  if (query.from_date) params.set('from_date', query.from_date)
  if (query.to_date) params.set('to_date', query.to_date)
  if (query.status) params.set('status', query.status)
  if (query.invoice_number) params.set('invoice_number', query.invoice_number)

  const endpoint = params.toString() ? `/invoices?${params.toString()}` : '/invoices'
  const response = await apiRequest<unknown>(endpoint)

  return getList(response)
    .map((item) => (item && typeof item === 'object' ? normalizeInvoice(item as UnknownMap) : null))
    .filter((item): item is InvoiceRecord => Boolean(item?.id))
}

export const getInvoiceById = async (invoiceId: number): Promise<InvoiceDetailRecord> => {
  const response = await apiRequest<{ data?: { invoice?: UnknownMap; items?: unknown[] } }>(`/invoices/${invoiceId}`)

  const invoiceRaw = response?.data?.invoice
  if (!invoiceRaw || typeof invoiceRaw !== 'object') {
    throw new Error('Invoice details not found')
  }

  const invoice = normalizeInvoice(invoiceRaw)
  const itemsRaw = Array.isArray(response?.data?.items) ? response.data?.items : []
  const items = itemsRaw
    .map((item) => (item && typeof item === 'object' ? normalizeInvoiceItem(item as UnknownMap) : null))
    .filter((item): item is InvoiceItemRecord => Boolean(item?.id))

  return {
    ...invoice,
    status: invoice.status === 'paid' || invoice.status === 'partial' ? invoice.status : 'pending',
    items,
  }
}

export const updateInvoiceStatus = async (invoiceId: number, items: Array<{ task_id: number; status: InvoiceItemRecord['status'] }>) => {
  return apiRequest<{ data?: { status?: string } }>(`/invoices/${invoiceId}/update-status`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}
