const DEFAULT_API_URL = 'https://ha-core.hastenload.com/api'

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_API_URL).replace(/\/+$/, '')
}

export const CORE_API_URL = normalizeBaseUrl(import.meta.env.VITE_CORE_API_URL)

export class CoreApiError extends Error {
  constructor(message, { status = 0, code = 'CORE_API_ERROR', details = null } = {}) {
    super(message)
    this.name = 'CoreApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function getAccessToken() {
  return (
    localStorage.getItem('hasten_access_token') ||
    sessionStorage.getItem('hasten_access_token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token') ||
    null
  )
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (response.status === 204) return null
  if (contentType.includes('application/json')) return response.json()
  return response.text()
}

export async function coreApiRequest(path, options = {}) {
  const token = options.token ?? getAccessToken()
  const headers = new Headers(options.headers || {})

  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${CORE_API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers,
      credentials: options.credentials || 'include',
      body:
        options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
          ? JSON.stringify(options.body)
          : options.body,
    })
  } catch (error) {
    throw new CoreApiError('Unable to reach the HASTEN Core API.', {
      code: 'NETWORK_ERROR',
      details: error instanceof Error ? error.message : String(error),
    })
  }

  const payload = await parseResponse(response)
  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
      `HASTEN Core API request failed with status ${response.status}.`
    throw new CoreApiError(message, {
      status: response.status,
      code: payload?.code || 'HTTP_ERROR',
      details: payload,
    })
  }

  return payload
}

export const coreApi = {
  get: (path, options = {}) => coreApiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => coreApiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => coreApiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => coreApiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => coreApiRequest(path, { ...options, method: 'DELETE' }),
}
