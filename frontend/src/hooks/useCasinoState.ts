import { useQuery } from '@tanstack/react-query'
import { fetchCasinoState } from '../api/client'
import { casinoKeys } from '../api/queryKeys'
import type { CasinoState } from '../types/casino'

export function useCasinoState() {
  return useQuery<CasinoState>({
    queryKey: casinoKeys.state(),
    queryFn: fetchCasinoState,
    // No polling - UI updates on user actions only
  })
}
