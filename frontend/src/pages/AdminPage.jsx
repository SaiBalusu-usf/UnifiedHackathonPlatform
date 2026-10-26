import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

export default function AdminPage() {
  const [agents, setAgents] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest('/agents/status')
      setAgents(result.agents || [])
      setError('')
    } catch (err) { setError(err.message) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  async function control(name, action) {
    setBusy(true)
    try {
      const result = await apiRequest(`/agents/${encodeURIComponent(name)}/${action}`, { method: 'POST' })
      if (!result.success) throw new Error(result.message || 'Agent operation failed')
      await refresh()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section className="container mx-auto p-6 space-y-4">
    <h1 className="text-2xl font-bold">Agent administration</h1>
    {error && <p role="alert">{error}</p>}
    <button onClick={refresh} disabled={busy}>Refresh status</button>
    {agents.map(agent => <article key={agent.name} className="border rounded p-4 space-y-2">
      <h2 className="font-semibold">{agent.name}</h2>
      <p>{agent.isRunning ? 'Running' : 'Stopped'}</p>
      <button disabled={busy} onClick={() => control(agent.name, agent.isRunning ? 'stop' : 'start')}>
        {agent.isRunning ? 'Stop' : 'Start'}
      </button>
    </article>)}
  </section>
}
