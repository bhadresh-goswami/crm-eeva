let unauthorizedHandler: (() => void) | undefined

const AUTH_STORAGE_KEY = 'crm_auth'
const API_BASE_URL = 'https://support.bsquareg-developers.com/api'

const isAbsoluteUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://')

const normalizePath = (path: string) => {
  if (!path) return ''

  const withSlash = path.startsWith('/') ? path : `/${path}`

  if (withSlash === '/api') {
    return ''
  }

  if (withSlash.startsWith('/api/')) {
    return withSlash.slice(4)
  }

  return withSlash
}

const buildApiUrl = (path: string) => {
  if (isAbsoluteUrl(path)) {
    return path
  }

  return `${API_BASE_URL}${normalizePath(path)}`
}

const getStoredToken = () => {
  const localRaw = localStorage.getItem(AUTH_STORAGE_KEY)
  const sessionRaw = sessionStorage.getItem(AUTH_STORAGE_KEY)
  const raw = localRaw ?? sessionRaw

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string; access_token?: string }
    return parsed.token ?? parsed.access_token ?? null
  } catch {
    const directToken = raw.trim()
    return directToken || null
  }
}

const shouldAttachAuthHeader = (path: string, headers: Headers) => {
  const explicitSkip = headers.get('X-Skip-Auth') === '1'
  if (explicitSkip) {
    headers.delete('X-Skip-Auth')
    return false
  }

  const requestPath = isAbsoluteUrl(path) ? new URL(path).pathname : normalizePath(path)
  return requestPath !== '/login'
}

const readErrorMessage = async (response: Response) => {
  const rawBody = await response.text()

  if (!rawBody) {
    return `Request failed with status ${response.status}`
  }

  try {
    const parsed = JSON.parse(rawBody) as { message?: string; error?: string }
    return parsed.message ?? parsed.error ?? rawBody
  } catch {
    return rawBody
  }
}

export const setUnauthorizedHandler = (handler?: () => void) => {
  unauthorizedHandler = handler
}

export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const token = getStoredToken()
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token && shouldAttachAuthHeader(path, headers)) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  })

  const isLoginRequest = (isAbsoluteUrl(path) ? new URL(path).pathname : normalizePath(path)) === '/login'

  if (response.status === 401 && !isLoginRequest) {
    unauthorizedHandler?.()
  }

  return response
}

export const apiRequest = async <TResponse = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> => {
  const response = await apiFetch(path, init)

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
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
