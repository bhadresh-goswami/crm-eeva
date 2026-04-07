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
  data?: unknown[]
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
  id: Number(raw.id ?? 0),
  name: String(raw.name ?? '').trim(),
  company_name: String(raw.company_name ?? '').trim(),
  mobile: String(raw.mobile ?? '').trim(),
  address: String(raw.address ?? '').trim(),
  gst: String(raw.gst ?? '').trim(),
  billing_type: normalizeBillingType(raw.billing_type),
  status: isActive(raw.status) ? 'Active' : 'Inactive',
})

export const getClients = async () => {
  const response = await apiRequest<ClientsListResponse>('/clients/list')
  const clients = response.data ?? []

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
