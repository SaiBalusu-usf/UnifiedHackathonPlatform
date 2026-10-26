import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest } from '../src/lib/api.js'

test('authenticated requests use a header and preserve operation failures', async () => {
  const previousFetch = globalThis.fetch
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'fixture-token' } })
  try {
    let seen
    globalThis.fetch = async (...args) => { seen = args; return { ok:true, json:async()=>({success:true}) } }
    assert.deepEqual(await apiRequest('/agents/example/start', { method:'POST' }), {success:true})
    assert.equal(seen[0], '/api/agents/example/start')
    assert.equal(seen[1].headers.Authorization, 'Bearer fixture-token')
    assert.equal(seen[1].method, 'POST')
    globalThis.fetch = async () => ({ok:false,status:403})
    await assert.rejects(apiRequest('/agents/status'), /403/)
  } finally {
    globalThis.fetch = previousFetch
    if (previousStorage) Object.defineProperty(globalThis,'localStorage',previousStorage)
    else delete globalThis.localStorage
  }
})
