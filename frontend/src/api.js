const BASE = import.meta.env.VITE_API_URL || '/api'

async function http(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
    } catch {}
    throw new Error(`${res.status}: ${detail}`)
  }
  return res.json()
}

export const api = {
  getServices: () =>
    http('/services'),

  generateQuestions: (service_id, description = '') =>
    http('/questions/generate', {
      method: 'POST',
      body: JSON.stringify({ service_id, description }),
    }),

  createOrder: (data) =>
    http('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listOrders: (status) =>
    http(`/orders${status ? `?status=${status}` : ''}`),

  getOrder: (id) =>
    http(`/orders/${id}`),

  acceptOrder: (id, contractor_name) =>
    http(`/orders/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ contractor_name }),
    }),

  completeOrder: (id) =>
    http(`/orders/${id}/complete`, { method: 'POST' }),
}
