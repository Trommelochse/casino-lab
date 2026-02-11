import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPlayer } from '../api/client'
import { casinoKeys } from '../api/queryKeys'

export function useCreatePlayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (archetype: 'Recreational' | 'VIP' | 'Bonus Hunter') =>
      createPlayer(archetype),
    onSuccess: () => {
      // Invalidate and refetch the casino state after player creation
      queryClient.invalidateQueries({ queryKey: casinoKeys.state() })
    },
  })
}
