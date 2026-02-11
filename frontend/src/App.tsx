import { useCasinoState } from './hooks/useCasinoState'

export default function App() {
  const { data, isPending, isError, error, isFetching } = useCasinoState()

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
        {/* Header with refresh indicator */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Casino Lab Dashboard
          </h1>
          {isFetching && (
            <span className="text-sm text-blue-600 animate-pulse">
              Refreshing...
            </span>
          )}
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
