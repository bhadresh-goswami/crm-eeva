import { apiRequest } from '../../../api/client'

export type BillingType = 'gst' | 'tds' | 'personal' | 'usa' | 'cash'

export type ClientItem = {
  id: number
  name: string
  company_name: string
  mobile: string
  address: string
  gst: string
  billing_type: BillingType
  status: 'Active' | 'Inactive'
}

type ClientsListResponse = {
  data?: unknown[] | { data?: unknown[]; clients?: unknown[]; list?: unknown[]; rows?: unknown[] }
  clients?: unknown[]
  list?: unknown[]
  rows?: unknown[]
}

export type ClientPayload = {
  name: string
  company_name: string
  mobile: string
  address: string
  gst: string
  billing_type: BillingType
}

const isActive = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'active' || normalized === 'true'
}

const normalizeBillingType = (value: unknown): BillingType => {
  const normalized = String(value ?? '').trim().toLowerCase() as BillingType
  const allowed: BillingType[] = ['gst', 'tds', 'personal', 'usa', 'cash']
  return allowed.includes(normalized) ? normalized : 'personal'
}

const normalizeClient = (raw: Record<string, unknown>): ClientItem => ({
  id: Number(raw.id ?? raw.client_id ?? 0),
  name: String(raw.name ?? raw.client_name ?? raw.customer_name ?? '').trim(),
  company_name: String(raw.company_name ?? raw.company ?? raw.organization_name ?? '').trim(),
  mobile: String(raw.mobile ?? raw.phone ?? raw.contact_no ?? '').trim(),
  address: String(raw.address ?? raw.billing_address ?? '').trim(),
  gst: String(raw.gst ?? raw.gst_no ?? raw.gstin ?? '').trim(),
  billing_type: normalizeBillingType(raw.billing_type),
  status: isActive(raw.status ?? raw.is_active ?? raw.active) ? 'Active' : 'Inactive',
})

export const getClients = async () => {
  const response = await apiRequest<ClientsListResponse>('/clients/list')
  const extractArrayPayload = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
      return value
    }

    if (!value || typeof value !== 'object') {
      return []
    }

    const source = value as Record<string, unknown>
    const directKeys = ['data', 'clients', 'list', 'rows', 'items', 'result', 'payload']

    for (const key of directKeys) {
      const found = source[key]
      if (Array.isArray(found)) {
        return found
      }
    }

    for (const key of directKeys) {
      const found = source[key]
      if (found && typeof found === 'object') {
        const nested = extractArrayPayload(found)
        if (nested.length > 0) {
          return nested
        }
      }
    }

    return []
  }

  const dataPayload = extractArrayPayload(response)

  const clients = Array.isArray(dataPayload) ? dataPayload : []

  return clients
    .map((item) => (item && typeof item === 'object' ? normalizeClient(item as Record<string, unknown>) : null))
    .filter((item): item is ClientItem => Boolean(item?.id && item.name))
}

export const createClient = async (payload: ClientPayload) =>
  apiRequest('/clients/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateClient = async (payload: ClientPayload & { id: number }) =>
  apiRequest('/clients/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const deleteClient = async (id: number) =>
  apiRequest('/clients/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })

export const toggleClientStatus = async (id: number) =>
  apiRequest('/clients/toggleStatus', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
