import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    apiRequest('/hackathons').then(result => { if (active) setHackathons(result.data || []) })
      .catch(err => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  return <section className="container mx-auto p-6 space-y-4">
    <h1 className="text-2xl font-bold">Hackathons</h1>
    {loading && <p>Loading hackathons…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !hackathons.length && <p>No hackathons are available.</p>}
    {hackathons.map(event => <article key={event.hackathon_id} className="border rounded p-4">
      <h2 className="font-semibold">{event.name}</h2>
      <p>{event.description}</p>
      <p>{new Date(event.start_date).toLocaleString()} – {new Date(event.end_date).toLocaleString()}</p>
    </article>)}
  </section>
}
