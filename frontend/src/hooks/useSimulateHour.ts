import { useMutation, useQueryClient } from '@tanstack/react-query'
import { simulateHour } from '../api/client'
import { casinoKeys } from '../api/queryKeys'

export function useSimulateHour() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: simulateHour,
    onSuccess: () => {
      // Invalidate and refetch the casino state after simulation
      queryClient.invalidateQueries({ queryKey: casinoKeys.state() })
    },
  })
}
