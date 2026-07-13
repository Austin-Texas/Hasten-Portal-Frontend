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

const THEME_STORAGE_KEY = 'hasten-theme-settings'

const readLocalThemeSettings = () => {
  if (!isBrowser) return []
  try {
    const value = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeLocalThemeSettings = (items) => {
  if (!isBrowser) return
  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(items))
}

const filterLocalThemeSettings = (filter = {}) =>
  readLocalThemeSettings().filter((item) =>
    Object.entries(filter || {}).every(([key, value]) => String(item?.[key] ?? '') === String(value ?? ''))
  )

const createLocalThemeSetting = (payload = {}) => {
  const items = readLocalThemeSettings()
  const now = new Date().toISOString()
  const item = {
    ...payload,
    id: payload.id || `local-theme-${payload.scope || 'user'}-${payload.target_id || payload.target_role || 'default'}`,
    created_date: payload.created_date || now,
    updated_date: now,
  }
  const existingIndex = items.findIndex((entry) => entry.id === item.id)
  if (existingIndex >= 0) items[existingIndex] = item
  else items.push(item)
  writeLocalThemeSettings(items)
  return item
}

const updateLocalThemeSetting = (id, payload = {}) => {
  const items = readLocalThemeSettings()
  const index = items.findIndex((item) => String(item.id) === String(id))
  const now = new Date().toISOString()
  const updated = index >= 0
    ? { ...items[index], ...payload, id: items[index].id, updated_date: now }
    : { ...payload, id, created_date: now, updated_date: now }
  if (index >= 0) items[index] = updated
  else items.push(updated)
  writeLocalThemeSettings(items)
  return updated
}

const makeEntity = (entityName) => {
  const normalizedName = normalizeEntityName(entityName)
  const resource = `/entities/${normalizedName}`
  const isThemeSetting = normalizedName === 'theme-setting'

  return {
    list: async (sort = '', limit) => {
      const params = new URLSearchParams()
      if (sort) params.set('sort', sort)
      if (limit) params.set('limit', String(limit))
      try {
        return unwrap(await coreApi.get(`${resource}${params.size ? `?${params}` : ''}`)) || []
      } catch (error) {
        if (!isThemeSetting) throw error
        const items = readLocalThemeSettings()
        return limit ? items.slice(0, limit) : items
      }
    },
    filter: async (filter = {}, sort = '', limit) => {
      const params = new URLSearchParams()
      Object.entries(filter || {}).forEach(([key, value]) => params.set(key, Array.isArray(value) ? value.join(',') : String(value)))
      if (sort) params.set('sort', sort)
      if (limit) params.set('limit', String(limit))
      try {
        return unwrap(await coreApi.get(`${resource}?${params}`)) || []
      } catch (error) {
        if (!isThemeSetting) throw error
        const items = filterLocalThemeSettings(filter)
        return limit ? items.slice(0, limit) : items
      }
    },
    get: async (id) => {
      try {
        return unwrap(await coreApi.get(`${resource}/${encodeURIComponent(id)}`))
      } catch (error) {
        if (!isThemeSetting) throw error
        return readLocalThemeSettings().find((item) => String(item.id) === String(id)) || null
      }
    },
    create: async (payload = {}) => {
      try {
        return unwrap(await coreApi.post(resource, payload))
      } catch (error) {
        if (!isThemeSetting) throw error
        return createLocalThemeSetting(payload)
      }
    },
    update: async (id, payload = {}) => {
      try {
        return unwrap(await coreApi.patch(`${resource}/${encodeURIComponent(id)}`, payload))
      } catch (error) {
        if (!isThemeSetting) throw error
        return updateLocalThemeSetting(id, payload)
      }
    },
    delete: async (id) => {
      try {
        return unwrap(await coreApi.delete(`${resource}/${encodeURIComponent(id)}`))
      } catch (error) {
        if (!isThemeSetting) throw error
        const items = readLocalThemeSettings().filter((item) => String(item.id) !== String(id))
        writeLocalThemeSettings(items)
        return { success: true }
      }
    },
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
// This object is backed by HASTEN Core API with a browser fallback for theme preferences.
export const base44 = hastenCore
