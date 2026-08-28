import { apiRequest } from '../../../api/client'

export type Role = {
  id: number
  name: string
  isActive: boolean
}

type RoleApiItem = {
  id?: number | string
  role_id?: number | string
  name?: string
  role_name?: string
  status?: boolean | number | string
  is_active?: boolean | number | string
  active?: boolean | number | string
}

const toBoolean = (value: RoleApiItem['status']) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'active' || normalized === 'true'
  }

  return false
}

const normalizeRole = (item: RoleApiItem): Role => ({
  id: Number(item.id ?? item.role_id ?? 0),
  name: String(item.name ?? item.role_name ?? '').trim(),
  isActive: toBoolean(item.is_active ?? item.active ?? item.status),
})

const extractRoles = (payload: unknown): RoleApiItem[] => {
  if (Array.isArray(payload)) {
    return payload as RoleApiItem[]
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>

    if (Array.isArray(record.roles)) {
      return record.roles as RoleApiItem[]
    }

    if (Array.isArray(record.data)) {
      return record.data as RoleApiItem[]
    }
  }

  return []
}

export const getRoles = async () => {
  const response = await apiRequest('/roles/list')
  return extractRoles(response)
    .map(normalizeRole)
    .filter((role) => role.id > 0 && role.name)
}

export const createRole = async (name: string) => {
  return apiRequest('/roles/create', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export const updateRole = async (id: number, name: string) => {
  return apiRequest('/roles/update', {
    method: 'POST',
    body: JSON.stringify({ id, name }),
  })
}

export const deleteRole = async (id: number) => {
  return apiRequest('/roles/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export const toggleRole = async (id: number) => {
  return apiRequest('/roles/toggle', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
