import { apiRequest, apiRequestWithFallback } from '../../../api/client'

export type UserItem = {
  id: number
  name: string
  email: string
  status: string
  role: string
  team_lead: string
}

export type RoleOption = {
  id: number
  name: string
}

export type CreateUserPayload = {
  name: string
  email: string
  password: string
  role_id: number
  team_lead_id?: number
}

export type UpdateUserPayload = {
  id: number
  name: string
  email: string
  role_id: number
  team_lead_id?: number
}

type UsersListResponse = {
  data?: UserItem[]
}

type RolesListResponse = {
  data?: Array<{ id: number | string; name: string }>
}

export const getUsers = async () => {
  const response = await apiRequestWithFallback<UsersListResponse>(['/users/list', '/users'])
  return response.data ?? []
}

export const getRoleOptions = async () => {
  const response = await apiRequestWithFallback<RolesListResponse>(['/roles/list', '/roles'])
  const data = response.data ?? []

  return data
    .map((role) => ({ id: Number(role.id), name: String(role.name ?? '').trim() }))
    .filter((role) => role.id > 0 && role.name)
}

export const createUser = async (data: CreateUserPayload) => {
  return apiRequest('/users/create', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export const updateUser = async (data: UpdateUserPayload) => {
  return apiRequest('/users/update', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export const deleteUser = async (id: number) => {
  return apiRequest('/users/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

export const toggleUser = async (id: number) => {
  return apiRequest('/users/toggle', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
