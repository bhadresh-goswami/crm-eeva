type AxiosHeaders = Record<string, string>

type AxiosRequestConfig = {
  baseURL?: string
  headers?: AxiosHeaders
}

type RequestConfig = {
  headers?: AxiosHeaders
}

type AxiosResponse<T = unknown> = {
  data: T
}

type RequestInterceptor = (config: RequestConfig) => RequestConfig

const toQueryJoin = (base: string, path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  if (base.endsWith('/') && path.startsWith('/')) {
    return `${base}${path.slice(1)}`
  }

  if (!base.endsWith('/') && !path.startsWith('/')) {
    return `${base}/${path}`
  }

  return `${base}${path}`
}

const parseBody = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) {
    return undefined as T
  }

  const rawBody = await response.text()

  if (!rawBody) {
    return undefined as T
  }

  try {
    return JSON.parse(rawBody) as T
  } catch {
    return rawBody as T
  }
}

const create = (config: AxiosRequestConfig = {}) => {
  let requestInterceptor: RequestInterceptor | null = null

  return {
    interceptors: {
      request: {
        use: (interceptor: RequestInterceptor) => {
          requestInterceptor = interceptor
        },
      },
    },
    get: async <T = unknown>(path: string): Promise<AxiosResponse<T>> => {
      const url = config.baseURL ? toQueryJoin(config.baseURL, path) : path
      const initialConfig: RequestConfig = {
        headers: { ...(config.headers ?? {}) },
      }
      const finalConfig = requestInterceptor ? requestInterceptor(initialConfig) : initialConfig

      const response = await fetch(url, {
        method: 'GET',
        headers: finalConfig.headers,
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Request failed with status ${response.status}`)
      }

      return { data: await parseBody<T>(response) }
    },
  }
}

const axios = { create }

export default axios
export type { AxiosRequestConfig, RequestConfig }
