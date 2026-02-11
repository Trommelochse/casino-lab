import { useCasinoState } from './hooks/useCasinoState'
import { useCreatePlayer } from './hooks/useCreatePlayer'
import { useSimulateHour } from './hooks/useSimulateHour'

export default function App() {
  const { data, isPending, isError, error } = useCasinoState()
  const { mutate: createPlayerMutation, isPending: isCreatingPlayer } = useCreatePlayer()
  const { mutate: simulateHourMutation, isPending: isSimulating } = useSimulateHour()

  // Initial loading state
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold animate-pulse">
          Loading casino state...
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl">
          Error: {error?.message || 'Failed to load casino state'}
        </div>
      </div>
    )
  }

  // Success state with data
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Casino Lab Dashboard
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={() => createPlayerMutation('Recreational')}
              disabled={isCreatingPlayer}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreatingPlayer ? 'Creating...' : 'Create Player'}
            </button>
            <button
              onClick={() => simulateHourMutation()}
              disabled={isSimulating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSimulating ? 'Simulating...' : 'Simulate 1 Hour'}
            </button>
          </div>
        </div>

        {/* Casino Totals */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Casino Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">House Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                €{parseFloat(data.casino.house_revenue).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Players</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.casino.active_player_count}
              </p>
            </div>
          </div>
        </div>

        {/* Player Count Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Players</h2>
          <p className="text-gray-700">
            Total Players: <span className="font-semibold">{data.players.length}</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(data.casino.updated_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
