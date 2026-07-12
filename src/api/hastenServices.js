import { coreApi } from '@/lib/coreApiClient'

const encode = (value) => encodeURIComponent(String(value))

export const authService = {
  me: () => coreApi.get('/auth/me'),
  login: (credentials) => coreApi.post('/auth/login', credentials),
  register: (profile) => coreApi.post('/auth/register', profile),
  refresh: (refreshToken) => coreApi.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => coreApi.post('/auth/logout', refreshToken ? { refreshToken } : {}),
  forgotPassword: (email) => coreApi.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => coreApi.post('/auth/reset-password', { token, password }),
}

export const dashboardService = {
  get: () => coreApi.get('/dashboard'),
  driver: () => coreApi.get('/drivers/me/dashboard'),
}

export const driverService = {
  list: (query = '') => coreApi.get(`/drivers${query ? `?${query}` : ''}`),
  get: (id) => coreApi.get(`/drivers/${encode(id)}`),
  create: (payload) => coreApi.post('/drivers', payload),
  update: (id, payload) => coreApi.patch(`/drivers/${encode(id)}`, payload),
  deactivate: (id) => coreApi.delete(`/drivers/${encode(id)}`),
  loads: (id) => coreApi.get(`/drivers/${encode(id)}/loads`),
  compliance: (id) => coreApi.get(`/drivers/${encode(id)}/compliance`),
  documents: (id) => coreApi.get(`/drivers/${encode(id)}/documents`),
  profile: () => coreApi.get('/drivers/me'),
  updateProfile: (payload) => coreApi.patch('/drivers/me', payload),
  updateAvailability: (availability) => coreApi.patch('/drivers/me/availability', { availability }),
  truck: () => coreApi.get('/drivers/me/truck'),
  updateTruck: (payload) => coreApi.patch('/drivers/me/truck', payload),
}

export const loadService = {
  list: (query = '') => coreApi.get(`/loads${query ? `?${query}` : ''}`),
  assigned: () => coreApi.get('/loads/assigned'),
  get: (id) => coreApi.get(`/loads/${encode(id)}`),
  create: (payload) => coreApi.post('/loads', payload),
  update: (id, payload) => coreApi.patch(`/loads/${encode(id)}`, payload),
  action: (id, action, payload = {}, idempotencyKey) =>
    coreApi.post(`/loads/${encode(id)}/${encode(action)}`, payload, { idempotencyKey }),
}

export const shipmentService = {
  list: (query = '') => coreApi.get(`/shipments${query ? `?${query}` : ''}`),
  get: (id) => coreApi.get(`/shipments/${encode(id)}`),
  create: (payload) => coreApi.post('/shipments', payload),
  update: (id, payload) => coreApi.patch(`/shipments/${encode(id)}`, payload),
}

export const quoteService = {
  list: (query = '') => coreApi.get(`/quotes${query ? `?${query}` : ''}`),
  get: (id) => coreApi.get(`/quotes/${encode(id)}`),
  create: (payload) => coreApi.post('/quotes', payload),
  update: (id, payload) => coreApi.patch(`/quotes/${encode(id)}`, payload),
}

export const trackingService = {
  drivers: () => coreApi.get('/tracking/drivers'),
  load: (id) => coreApi.get(`/tracking/load/${encode(id)}`),
  route: (id) => coreApi.get(`/tracking/route/${encode(id)}`),
  updateLocation: (payload) => coreApi.post('/tracking/location', payload),
}

export const messageService = {
  conversations: () => coreApi.get('/messages/conversations'),
  createConversation: (payload) => coreApi.post('/messages/conversations', payload),
  messages: (conversationId, limit = 100) =>
    coreApi.get(`/messages/conversations/${encode(conversationId)}/messages?limit=${limit}`),
  send: (conversationId, payload) =>
    coreApi.post(`/messages/conversations/${encode(conversationId)}/messages`, payload),
  markRead: (conversationId) =>
    coreApi.patch(`/messages/conversations/${encode(conversationId)}/read`, {}),
}

export const notificationService = {
  list: (unreadOnly = false) => coreApi.get(`/notifications?unreadOnly=${unreadOnly}`),
  markRead: (id) => coreApi.patch(`/notifications/${encode(id)}/read`, {}),
  markAllRead: () => coreApi.post('/notifications/read-all', {}),
}

export const documentService = {
  mine: () => coreApi.get('/documents/mine'),
  upload: (payload) => coreApi.post('/documents/upload', payload),
  downloadUrl: (id) => `${import.meta.env.VITE_CORE_API_URL || 'https://api.hastenload.com/api/v1'}/documents/${encode(id)}/download`,
}

export const settlementService = {
  list: () => coreApi.get('/settlements'),
  mine: () => coreApi.get('/settlements/mine'),
  get: (id) => coreApi.get(`/settlements/${encode(id)}`),
  pdfUrl: (id) => `${import.meta.env.VITE_CORE_API_URL || 'https://api.hastenload.com/api/v1'}/settlements/${encode(id)}/pdf`,
  batches: () => coreApi.get('/settlements/batches'),
}

export const invoiceService = {
  list: (query = '') => coreApi.get(`/invoices${query ? `?${query}` : ''}`),
  get: (id) => coreApi.get(`/invoices/${encode(id)}`),
  create: (payload) => coreApi.post('/invoices', payload),
  update: (id, payload) => coreApi.patch(`/invoices/${encode(id)}`, payload),
}

export const maintenanceService = {
  list: (query = '') => coreApi.get(`/maintenance${query ? `?${query}` : ''}`),
  get: (id) => coreApi.get(`/maintenance/${encode(id)}`),
  create: (payload) => coreApi.post('/maintenance', payload),
  update: (id, payload) => coreApi.patch(`/maintenance/${encode(id)}`, payload),
}

export const fuelService = {
  list: (query = '') => coreApi.get(`/fuel${query ? `?${query}` : ''}`),
  get: (id) => coreApi.get(`/fuel/${encode(id)}`),
  create: (payload) => coreApi.post('/fuel', payload),
  update: (id, payload) => coreApi.patch(`/fuel/${encode(id)}`, payload),
}

export const settingsService = {
  get: () => coreApi.get('/settings'),
  update: (payload) => coreApi.patch('/settings', payload),
}
