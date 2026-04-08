import { apiRequest } from '../../../api/client'

export type CandidateItem = {
  id: number
  client_id: number | null
  client_name: string
  name: string
  contact_number: string
  email: string
}

export type CandidatePayload = {
  client_id?: number
  name: string
  contact_number: string
  email?: string
}

type CandidatesListResponse = {
  data?: unknown[] | Record<string, unknown>
  candidates?: unknown[]
  list?: unknown[]
  rows?: unknown[]
}

const extractArrayPayload = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  const source = value as Record<string, unknown>
  const keys = ['data', 'candidates', 'list', 'rows', 'items', 'result', 'payload']

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
      if (nested.length) {
        return nested
      }
    }
  }

  return []
}

const normalizeCandidate = (raw: Record<string, unknown>): CandidateItem => ({
  id: Number(raw.id ?? raw.candidate_id ?? 0),
  client_id: raw.client_id == null || raw.client_id === '' ? null : Number(raw.client_id),
  client_name: String(raw.client_name ?? raw.client ?? raw.clientLabel ?? '').trim(),
  name: String(raw.name ?? raw.candidate_name ?? '').trim(),
  contact_number: String(raw.contact_number ?? raw.contact ?? raw.mobile ?? raw.phone ?? '').trim(),
  email: String(raw.email ?? '').trim(),
})

export const getCandidates = async () => {
  const loadWithMethod = (method: 'GET' | 'POST') =>
    apiRequest<CandidatesListResponse | string>('/candidates/list', method === 'GET'
      ? undefined
      : {
          method: 'POST',
          body: JSON.stringify({}),
        })

  let response: CandidatesListResponse | string

  try {
    response = await loadWithMethod('GET')
  } catch (error) {
    try {
      response = await loadWithMethod('POST')
    } catch {
      throw error
    }
  }

  let records = extractArrayPayload(response)

  if (records.length === 0 && typeof response === 'string') {
    try {
      const fallbackResponse = await loadWithMethod('POST')
      records = extractArrayPayload(fallbackResponse)
    } catch {
      // Keep empty records if fallback fails.
    }
  }

  return records
    .map((item) => (item && typeof item === 'object' ? normalizeCandidate(item as Record<string, unknown>) : null))
    .filter((item): item is CandidateItem => Boolean(item?.id && item.name && item.contact_number))
}

export const createCandidate = (payload: CandidatePayload) =>
  apiRequest('/candidates/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateCandidate = (payload: CandidatePayload & { id: number }) =>
  apiRequest('/candidates/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const deleteCandidate = (id: number) =>
  apiRequest('/candidates/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
