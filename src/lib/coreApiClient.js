const DEFAULT_API_URL = 'https://api.hastenload.com/api/v1'

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

function getStorage() {
  if (typeof window === 'undefined') return null
  return window
}

function getAccessToken() {
  const browser = getStorage()
  if (!browser) return null
  return (
    browser.localStorage.getItem('hasten_access_token') ||
    browser.sessionStorage.getItem('hasten_access_token') ||
    browser.localStorage.getItem('access_token') ||
    browser.sessionStorage.getItem('access_token') ||
    null
  )
}

function getRefreshToken() {
  const browser = getStorage()
  if (!browser) return null
  return (
    browser.localStorage.getItem('hasten_refresh_token') ||
    browser.sessionStorage.getItem('hasten_refresh_token') ||
    null
  )
}

function storeSession(payload) {
  const browser = getStorage()
  if (!browser) return
  const accessToken = payload?.accessToken || payload?.access_token || payload?.token
  const refreshToken = payload?.refreshToken || payload?.refresh_token
  if (accessToken) browser.localStorage.setItem('hasten_access_token', accessToken)
  if (refreshToken) browser.localStorage.setItem('hasten_refresh_token', refreshToken)
}

function clearSession() {
  const browser = getStorage()
  if (!browser) return
  for (const storage of [browser.localStorage, browser.sessionStorage]) {
    storage.removeItem('hasten_access_token')
    storage.removeItem('hasten_refresh_token')
    storage.removeItem('access_token')
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (response.status === 204) return null
  if (contentType.includes('application/json')) return response.json()
  return response.text()
}

let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  if (!refreshPromise) {
    refreshPromise = fetch(`${CORE_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const payload = await parseResponse(response)
        if (!response.ok) throw new Error(payload?.message || 'Session refresh failed.')
        storeSession(payload)
        return payload?.accessToken || payload?.access_token || null
      })
      .catch(() => {
        clearSession()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function coreApiRequest(path, options = {}) {
  const token = options.token ?? getAccessToken()
  const headers = new Headers(options.headers || {})

  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  if (options.idempotencyKey && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', options.idempotencyKey)
  }

  const requestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
    body:
      options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  }

  let response
  try {
    response = await fetch(`${CORE_API_URL}${path.startsWith('/') ? path : `/${path}`}`, requestInit)
  } catch (error) {
    throw new CoreApiError('Unable to reach the HASTEN Core API.', {
      code: 'NETWORK_ERROR',
      details: error instanceof Error ? error.message : String(error),
    })
  }

  if (response.status === 401 && !options.skipRefresh && !String(path).startsWith('/auth/')) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      const retryHeaders = new Headers(headers)
      retryHeaders.set('Authorization', `Bearer ${refreshedToken}`)
      return coreApiRequest(path, { ...options, headers: retryHeaders, token: refreshedToken, skipRefresh: true })
    }
  }

  const payload = await parseResponse(response)
  if (!response.ok) {
    if (response.status === 401) clearSession()
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
