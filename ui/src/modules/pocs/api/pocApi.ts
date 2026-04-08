import { apiRequest } from '../../../api/client'

export type PocStatus = 'Active' | 'Inactive'

export type PocItem = {
  id: number
  client_id: number
  client_name: string
  name: string
  email: string
  mobile: string
  status: PocStatus
}

export type ClientOption = {
  id: number
  name: string
}

type PocPayload = {
  client_id: number
  name: string
  email: string
  mobile: string
}

const extractArrayPayload = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  const source = value as Record<string, unknown>
  const keys = ['data', 'list', 'rows', 'items', 'result', 'payload', 'clients', 'pocs']

  for (const key of keys) {
    const found = source[key]
    if (Array.isArray(found)) {
      return found
    }
  }

  for (const key of keys) {
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

const normalizeStatus = (value: unknown): PocStatus => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'active' || normalized === 'true' ? 'Active' : 'Inactive'
}

const normalizePoc = (raw: Record<string, unknown>): PocItem => ({
  id: Number(raw.id ?? raw.poc_id ?? 0),
  client_id: Number(raw.client_id ?? raw.clientId ?? 0),
  client_name: String(raw.client_name ?? raw.client ?? raw.clientTitle ?? '').trim(),
  name: String(raw.name ?? '').trim(),
  email: String(raw.email ?? '').trim(),
  mobile: String(raw.mobile ?? raw.phone ?? '').trim(),
  status: normalizeStatus(raw.status ?? raw.is_active ?? raw.active),
})

const normalizeClient = (raw: Record<string, unknown>): ClientOption => ({
  id: Number(raw.id ?? raw.client_id ?? 0),
  name: String(raw.name ?? raw.client_name ?? '').trim(),
})

export const getPocs = async () => {
  const response = await apiRequest('/pocs/list')
  const pocs = extractArrayPayload(response)

  return pocs
    .map((item) => (item && typeof item === 'object' ? normalizePoc(item as Record<string, unknown>) : null))
    .filter((item): item is PocItem => Boolean(item?.id && item.name && item.email))
}

export const createPoc = async (payload: PocPayload) =>
  apiRequest('/pocs/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updatePoc = async (payload: PocPayload & { id: number }) =>
  apiRequest('/pocs/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const deletePoc = async (id: number) =>
  apiRequest('/pocs/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })

export const togglePocStatus = async (id: number) =>
  apiRequest('/pocs/toggle', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })

export const getClientOptions = async () => {
  const response = await apiRequest('/clients/list')
  const clients = extractArrayPayload(response)

  return clients
    .map((item) => (item && typeof item === 'object' ? normalizeClient(item as Record<string, unknown>) : null))
    .filter((item): item is ClientOption => Boolean(item?.id && item.name))
    .sort((a, b) => a.name.localeCompare(b.name))
}
