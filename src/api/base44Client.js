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

const ENTITY_RESOURCES = {
  user: '/users',
  users: '/users',
  driver: '/drivers',
  drivers: '/drivers',
  load: '/loads',
  loads: '/loads',
  shipment: '/shipments',
  shipments: '/shipments',
  quote: '/quotes',
  quotes: '/quotes',
  settlement: '/settlements',
  settlements: '/settlements',
  invoice: '/invoices',
  invoices: '/invoices',
  document: '/documents',
  documents: '/documents',
  notification: '/notifications',
  notifications: '/notifications',
  maintenance: '/maintenance',
  'maintenance-record': '/maintenance',
  'maintenance-records': '/maintenance',
  fuel: '/fuel',
  'fuel-transaction': '/fuel',
  'fuel-transactions': '/fuel',
  party: '/parties',
  parties: '/parties',
  customer: '/parties?party_type=customer',
  customers: '/parties?party_type=customer',
  broker: '/parties?party_type=broker',
  brokers: '/parties?party_type=broker',
  conversation: '/messages/conversations',
  conversations: '/messages/conversations',
}

function resolveEntityResource(entityName) {
  const normalized = normalizeEntityName(entityName)
  const resource = ENTITY_RESOURCES[normalized]
  if (!resource) {
    throw new Error(`Portal module "${entityName}" is not mapped to a native HASTEN Core API resource.`)
  }
  return resource
}

function appendParams(resource, params) {
  const separator = resource.includes('?') ? '&' : '?'
  return params.size ? `${resource}${separator}${params}` : resource
}

const makeEntity = (entityName) => ({
  list: async (sort = '', limit) => {
    const resource = resolveEntityResource(entityName)
    const params = new URLSearchParams()
    if (sort) params.set('sort', sort)
    if (limit) params.set('limit', String(limit))
    return unwrap(await coreApi.get(appendParams(resource, params))) || []
  },
  filter: async (filter = {}, sort = '', limit) => {
    const resource = resolveEntityResource(entityName)
    const params = new URLSearchParams()
    Object.entries(filter || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, Array.isArray(value) ? value.join(',') : String(value))
      }
    })
    if (sort) params.set('sort', sort)
    if (limit) params.set('limit', String(limit))
    return unwrap(await coreApi.get(appendParams(resource, params))) || []
  },
  get: async (id) => {
    const resource = resolveEntityResource(entityName).split('?')[0]
    return unwrap(await coreApi.get(`${resource}/${encodeURIComponent(id)}`))
  },
  create: async (payload = {}) => {
    const resource = resolveEntityResource(entityName).split('?')[0]
    return unwrap(await coreApi.post(resource, payload))
  },
  update: async (id, payload = {}) => {
    const resource = resolveEntityResource(entityName).split('?')[0]
    return unwrap(await coreApi.patch(`${resource}/${encodeURIComponent(id)}`, payload))
  },
  delete: async (id) => {
    const resource = resolveEntityResource(entityName).split('?')[0]
    return unwrap(await coreApi.delete(`${resource}/${encodeURIComponent(id)}`))
  },
  bulkCreate: async (items = []) => Promise.all(items.map((item) => makeEntity(entityName).create(item))),
  updateMany: async (items = []) => Promise.all(items.map(({ id, ...payload }) => makeEntity(entityName).update(id, payload))),
  deleteMany: async (ids = []) => Promise.all(ids.map((id) => makeEntity(entityName).delete(id))),
  subscribe: () => () => undefined,
})

const auth = {
  me: async () => {
    const localUser = readLocalUser()
    if (isLocalDemoMode && localUser) return localUser
    return unwrap(await coreApi.get('/auth/me'))
  },
  login: async ({ email, password, remember = false }) => {
    const payload = await coreApi.post('/auth/login', { email, password, remember })
    const accessToken = payload?.access_token || payload?.accessToken || payload?.token
    const refreshToken = payload?.refresh_token || payload?.refreshToken
    if (accessToken && isBrowser) {
      const storage = remember ? window.localStorage : window.sessionStorage
      storage.setItem('hasten_access_token', accessToken)
      if (refreshToken) storage.setItem('hasten_refresh_token', refreshToken)
    }
    return payload
  },
  logout: async () => {
    const refreshToken = isBrowser
      ? window.localStorage.getItem('hasten_refresh_token') || window.sessionStorage.getItem('hasten_refresh_token')
      : null
    try {
      await coreApi.post('/auth/logout', refreshToken ? { refreshToken } : {})
    } finally {
      if (isBrowser) {
        window.localStorage.removeItem('hasten_access_token')
        window.sessionStorage.removeItem('hasten_access_token')
        window.localStorage.removeItem('hasten_refresh_token')
        window.sessionStorage.removeItem('hasten_refresh_token')
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
      window.location.href = `${import.meta.env.VITE_CORE_API_URL || 'https://api.hastenload.com/api/v1'}/auth/oauth/${encodeURIComponent(provider)}?redirect_uri=${callback}`
    }
  },
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read the selected file.'))
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result)
    }
    reader.readAsDataURL(file)
  })
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
      const options = fileOrOptions?.file ? fileOrOptions : { file: fileOrOptions }
      const file = options.file
      if (!(file instanceof File)) throw new Error('A valid file is required.')
      const fileDataBase64 = await fileToBase64(file)
      return unwrap(await coreApi.post('/documents/upload', {
        documentType: options.documentType || options.doc_type || 'other',
        mimeType: file.type,
        fileName: file.name,
        fileDataBase64,
        loadId: options.loadId || options.load_id || null,
        expiresAt: options.expiresAt || options.expires_at || null,
        notes: options.notes || null,
      }))
    },
  },
}

// Temporary import compatibility only. All operations above use native HA-Core API routes.
export const base44 = hastenCore
