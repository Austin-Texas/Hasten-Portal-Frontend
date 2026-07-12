import { coreApi } from './coreApiClient'

const STORE_KEY = 'hasten_partner_portal_store_v2'

function emptyStore() {
  return { loadRequests: [], documentRequests: [], invoiceDisputes: [], notifications: [], auditEvents: [] }
}

export function readPartnerPortalStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || emptyStore()
  } catch {
    return emptyStore()
  }
}

function writePartnerPortalStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
  window.dispatchEvent(new CustomEvent('hasten_partner_portal_changed', { detail: store }))
  return store
}

function announceSyncFailure(action, error) {
  window.dispatchEvent(
    new CustomEvent('hasten_core_api_error', {
      detail: {
        action,
        message: error instanceof Error ? error.message : String(error),
      },
    }),
  )
}

function syncInBackground(action, request) {
  void request.catch((error) => announceSyncFailure(action, error))
}

export function submitPartnerLoadRequest(input = {}) {
  const store = readPartnerPortalStore()
  const request = {
    ...input,
    status: input.status || 'submitted',
    created_at: input.created_at || new Date().toISOString(),
  }

  syncInBackground('partner_load_request', coreApi.post('/partner/load-requests', request))
  return writePartnerPortalStore({ ...store, loadRequests: [request, ...(store.loadRequests || [])] })
}

export function requestPartnerDocument(input = {}) {
  const store = readPartnerPortalStore()
  const request = {
    ...input,
    document_type: input.document_type || 'POD',
    status: input.status || 'requested',
    created_at: input.created_at || new Date().toISOString(),
  }

  syncInBackground('partner_document_request', coreApi.post('/partner/document-requests', request))
  return writePartnerPortalStore({ ...store, documentRequests: [request, ...(store.documentRequests || [])] })
}

export function openPartnerInvoiceDispute(input = {}) {
  const store = readPartnerPortalStore()
  const dispute = {
    ...input,
    reason: input.reason || 'Invoice review requested.',
    status: input.status || 'open',
    created_at: input.created_at || new Date().toISOString(),
  }

  syncInBackground('partner_invoice_dispute', coreApi.post('/partner/invoice-disputes', dispute))
  return writePartnerPortalStore({ ...store, invoiceDisputes: [dispute, ...(store.invoiceDisputes || [])] })
}

export function queuePartnerNotification(input = {}) {
  const store = readPartnerPortalStore()
  const notification = {
    ...input,
    title: input.title || 'Portal update',
    message: input.message || 'New update available.',
    severity: input.severity || 'info',
    channel: input.channel || 'portal',
    created_at: input.created_at || new Date().toISOString(),
  }

  syncInBackground('partner_notification', coreApi.post('/notifications', notification))
  return writePartnerPortalStore({ ...store, notifications: [notification, ...(store.notifications || [])] })
}

export async function refreshPartnerPortalStore() {
  const payload = await coreApi.get('/partner/portal')
  return writePartnerPortalStore({ ...emptyStore(), ...(payload?.data || payload || {}) })
}

export function getPartnerPortalActionSummary() {
  const store = readPartnerPortalStore()
  return {
    load_requests: (store.loadRequests || []).length,
    document_requests: (store.documentRequests || []).length,
    open_disputes: (store.invoiceDisputes || []).filter((item) => item.status !== 'closed').length,
    notifications: (store.notifications || []).length,
    audit_events: (store.auditEvents || []).length,
  }
}
