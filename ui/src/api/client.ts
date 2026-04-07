let unauthorizedHandler: (() => void) | undefined

const AUTH_STORAGE_KEY = 'crm_auth'

const getStoredToken = () => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string }
    return parsed.token ?? null
  } catch {
    return null
  }
}

export const setUnauthorizedHandler = (handler?: () => void) => {
  unauthorizedHandler = handler
}

export const apiRequest = async <TResponse = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> => {
  const token = getStoredToken()
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
