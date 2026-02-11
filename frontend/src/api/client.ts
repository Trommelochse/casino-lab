const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function fetchCasinoState() {
  const response = await fetch(`${API_BASE_URL}/state`)

  if (!response.ok) {
    throw new Error(`Failed to fetch casino state: ${response.statusText}`)
  }

  return response.json()
}

export async function createPlayer(archetype: 'Recreational' | 'VIP' | 'Bonus Hunter') {
  const response = await fetch(`${API_BASE_URL}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archetype }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create player: ${response.statusText}`)
  }

  return response.json()
}

export async function simulateHour() {
  const response = await fetch(`${API_BASE_URL}/simulate/hour`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to simulate hour: ${response.statusText}`)
  }

  return response.json()
}
