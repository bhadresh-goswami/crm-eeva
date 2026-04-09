let unauthorizedHandler: (() => void) | undefined

const AUTH_STORAGE_KEY = 'crm_auth'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'

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

  if (path.startsWith('/api/')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}


class ApiHttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
  }
}

const parseErrorMessage = (body: string, status: number) => {
  if (!body) {
    return `Request failed with status ${status}`
  }

  try {
    const parsed = JSON.parse(body) as {
      message?: string
      error?: string
      errors?: string[]
      data?: { message?: string; error?: string }
    }

    const candidate =
      parsed.message ??
      parsed.error ??
      parsed.data?.message ??
      parsed.data?.error ??
      (Array.isArray(parsed.errors) ? parsed.errors[0] : '')

    if (candidate && String(candidate).trim()) {
      return String(candidate).trim()
    }
  } catch {
    // Ignore JSON parse error and fallback to plain text.
  }

  return body
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

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const isAuthRoute = normalizedPath === '/login'

  if (token && !isAuthRoute) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const requestUrl = buildApiUrl(path)
  const response = await fetch(requestUrl, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    const message = parseErrorMessage(await response.text(), response.status)
    throw new ApiHttpError(response.status, message)
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

export const apiRequestWithFallback = async <TResponse = unknown>(
  paths: string[],
  init: RequestInit = {},
): Promise<TResponse> => {
  let lastError: unknown = null

  for (const path of paths) {
    try {
      return await apiRequest<TResponse>(path, init)
    } catch (error) {
      if (error instanceof ApiHttpError && error.status !== 404) {
        throw error
      }
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('API request failed.')
}
