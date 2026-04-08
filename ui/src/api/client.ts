let unauthorizedHandler: (() => void) | undefined

const AUTH_STORAGE_KEY = 'crm_auth'
const API_BASE_URL = 'https://support.bsquareg-developers.com/api'

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

const buildApiUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
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

  const requestUrl = buildApiUrl(path)
  console.info('[apiRequest] URL:', requestUrl)
  if (init.body) {
    console.info('[apiRequest] Body:', init.body)
  }

  const response = await fetch(requestUrl, {
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

  const rawBody = await response.text()

  if (!rawBody) {
    return undefined as TResponse
  }

  try {
    return JSON.parse(rawBody) as TResponse
  } catch {
    return rawBody as TResponse
  }
}
