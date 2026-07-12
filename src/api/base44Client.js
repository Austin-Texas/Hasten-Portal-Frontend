import { coreApi } from '@/lib/coreApiClient'

const isBrowser = typeof window !== 'undefined'
const isLocalHost = isBrowser && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const forceLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'true'
const disableLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'false'

export const isLocalDemoMode = forceLocalAuth || (!disableLocalAuth && isLocalHost)

const readLocalUser = () => {
  if (!isBrowser) return null
  try {
    const raw = window.localStorage.getItem('hasten_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    window.localStorage.removeItem('hasten_user')
    return null
  }
}

const normalizeEntityName = (name) =>
  String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()

const unwrap = (payload) => payload?.data ?? payload?.items ?? payload

const makeEntity = (entityName) => {
  const resource = `/entities/${normalizeEntityName(entityName)}`

  return {
    list: async (sort = '', limit) => {
      const params = new URLSearchParams()
      if (sort) params.set('sort', sort)
      if (limit) params.set('limit', String(limit))
      return unwrap(await coreApi.get(`${resource}${params.size ? `?${params}` : ''}`)) || []
    },
    filter: async (filter = {}, sort = '', limit) => {
      const params = new URLSearchParams()
      Object.entries(filter || {}).forEach(([key, value]) => params.set(key, Array.isArray(value) ? value.join(',') : String(value)))
      if (sort) params.set('sort', sort)
      if (limit) params.set('limit', String(limit))
      return unwrap(await coreApi.get(`${resource}?${params}`)) || []
    },
    get: async (id) => unwrap(await coreApi.get(`${resource}/${encodeURIComponent(id)}`)),
    create: async (payload = {}) => unwrap(await coreApi.post(resource, payload)),
    update: async (id, payload = {}) => unwrap(await coreApi.patch(`${resource}/${encodeURIComponent(id)}`, payload)),
    delete: async (id) => unwrap(await coreApi.delete(`${resource}/${encodeURIComponent(id)}`)),
    bulkCreate: async (items = []) => unwrap(await coreApi.post(`${resource}/bulk`, { items })),
    updateMany: async (items = []) => unwrap(await coreApi.patch(`${resource}/bulk`, { items })),
    deleteMany: async (ids = []) => unwrap(await coreApi.delete(`${resource}/bulk`, { body: { ids } })),
    subscribe: () => () => undefined,
  }
}

const auth = {
  me: async () => {
    const localUser = readLocalUser()
    if (isLocalDemoMode && localUser) return localUser
    return unwrap(await coreApi.get('/auth/me'))
  },
  login: async ({ email, password, remember = false }) => {
    const payload = unwrap(await coreApi.post('/auth/login', { email, password, remember }))
    const accessToken = payload?.access_token || payload?.accessToken || payload?.token
    if (accessToken && isBrowser) {
      const storage = remember ? window.localStorage : window.sessionStorage
      storage.setItem('hasten_access_token', accessToken)
    }
    return payload
  },
  logout: async () => {
    try {
      await coreApi.post('/auth/logout', {})
    } finally {
      if (isBrowser) {
        window.localStorage.removeItem('hasten_access_token')
        window.sessionStorage.removeItem('hasten_access_token')
        window.localStorage.removeItem('hasten_user')
      }
    }
  },
  redirectToLogin: () => {
    if (isBrowser) window.location.href = '/login'
  },
  loginWithProvider: (provider, redirectPath = '/dashboard') => {
    if (isBrowser) {
      const callback = encodeURIComponent(`${window.location.origin}${redirectPath}`)
      window.location.href = `${import.meta.env.VITE_CORE_API_URL || 'https://ha-core.hastenload.com/api'}/auth/oauth/${encodeURIComponent(provider)}?redirect_uri=${callback}`
    }
  },
}

export const hastenCore = {
  auth,
  entities: new Proxy({}, {
    get: (_target, entityName) => (typeof entityName === 'symbol' ? undefined : makeEntity(entityName)),
  }),
  functions: {
    invoke: async (name, payload = {}) => unwrap(await coreApi.post(`/functions/${encodeURIComponent(name)}`, payload)),
  },
  integrations: new Proxy({}, {
    get: (_target, integrationName) => new Proxy({}, {
      get: (_inner, actionName) => async (payload = {}) =>
        unwrap(await coreApi.post(`/integrations/${normalizeEntityName(integrationName)}/${normalizeEntityName(actionName)}`, payload)),
    }),
  }),
  files: {
    uploadFile: async (fileOrOptions) => {
      const file = fileOrOptions?.file || fileOrOptions
      const form = new FormData()
      form.append('file', file)
      return unwrap(await coreApi.post('/documents/upload', form))
    },
  },
}

// Temporary compatibility export while existing portal imports are renamed.
// This object is backed exclusively by the HASTEN Core API; no Base44 SDK is used.
export const base44 = hastenCore
