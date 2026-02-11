export interface CasinoState {
  casino: {
    id: number
    house_revenue: string
    active_player_count: number
    updated_at: string
  }
  players: Player[]
}

export interface Player {
  id: string
  archetype: 'Recreational' | 'VIP' | 'Bonus Hunter'
  status: 'Idle' | 'Active' | 'Broke'
  walletBalance: string
  lifetimePL: string
  remainingCapital: string
  dnaTraits: PlayerDNA
  createdAt: string
  updatedAt: string
}

export interface PlayerDNA {
  basePReturn: number
  riskAppetite: number
  betFlexibility: number
  promoDependency: number
  stopLossLimit: number
  profitGoal: number | null
  initialCapital: number
  preferredVolatility: 'low' | 'medium' | 'high'
}
