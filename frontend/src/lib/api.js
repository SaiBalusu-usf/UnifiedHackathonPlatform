export async function apiRequest(path, options = {}) {
  const base = import.meta.env?.VITE_API_BASE_URL || '/api'
  const token = globalThis.localStorage?.getItem('token')
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json()
}
