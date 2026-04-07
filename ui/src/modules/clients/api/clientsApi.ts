import { apiRequest } from '../../../api/client'

export type PocItem = {
  id: number
  client_id: number
  client_name: string
  name: string
  email: string
  mobile: string
  status: string
}

export type ClientItem = {
  id: number
  name: string
  status: string
  pocs: PocItem[]
}

type ListResponse = {
  data?: unknown[]
}

const isActiveValue = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'active' || normalized === '1' || normalized === 'true'
}

const normalizePoc = (raw: Record<string, unknown>, fallbackClient: { id: number; name: string }): PocItem => ({
  id: Number(raw.id ?? 0),
  client_id: Number(raw.client_id ?? fallbackClient.id),
  client_name: String(raw.client_name ?? fallbackClient.name ?? '').trim(),
  name: String(raw.name ?? raw.poc_name ?? '').trim(),
  email: String(raw.email ?? '').trim(),
  mobile: String(raw.mobile ?? raw.phone ?? '').trim(),
  status: isActiveValue(raw.status) ? 'Active' : 'Inactive',
})

const normalizeClient = (raw: Record<string, unknown>): ClientItem => {
  const id = Number(raw.id ?? 0)
  const name = String(raw.name ?? raw.client_name ?? '').trim()
  const rawPocs = Array.isArray(raw.pocs)
    ? raw.pocs
    : Array.isArray(raw.contacts)
      ? raw.contacts
      : Array.isArray(raw.poc_list)
        ? raw.poc_list
        : []

  return {
    id,
    name,
    status: isActiveValue(raw.status) ? 'Active' : 'Inactive',
    pocs: rawPocs
      .map((item) => (item && typeof item === 'object' ? normalizePoc(item as Record<string, unknown>, { id, name }) : null))
      .filter((item): item is PocItem => Boolean(item?.id && item?.name)),
  }
}

export const getClients = async () => {
  const response = await apiRequest<ListResponse>('/clients/list')
  const list = response.data ?? []

  return list
    .map((item) => (item && typeof item === 'object' ? normalizeClient(item as Record<string, unknown>) : null))
    .filter((item): item is ClientItem => Boolean(item?.id && item.name))
}

export const createClient = async (payload: { name: string }) =>
  apiRequest('/clients/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateClient = async (payload: { id: number; name: string }) =>
  apiRequest('/clients/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const deleteClient = async (id: number) =>
  apiRequest('/clients/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })

export const toggleClient = async (id: number) =>
  apiRequest('/clients/toggle', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })

export const createPoc = async (payload: {
  client_id: number
  name: string
  email: string
  mobile: string
}) =>
  apiRequest('/pocs/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updatePoc = async (payload: {
  id: number
  client_id: number
  name: string
  email: string
  mobile: string
}) =>
  apiRequest('/pocs/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const deletePoc = async (id: number) =>
  apiRequest('/pocs/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })

export const togglePoc = async (id: number) =>
  apiRequest('/pocs/toggle', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
