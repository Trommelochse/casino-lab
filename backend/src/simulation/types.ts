import { GameRound } from '../models/gameRound.js'
import { Player, PlayerStatus } from '../models/player.js'
import { Session } from '../models/session.js'
import { Rng } from '../services/rng.js'

// Micro-bet loop input
export interface MicroBetLoopInput {
  player: Player
  session: Session
  spinsPerHour: number
  rng: Rng
  simulationTimestamp: string
}

// Micro-bet loop result
export interface MicroBetLoopResult {
  rounds: GameRound[]
  finalBalance: string
  finalStatus: PlayerStatus
  exitReason: 'spins_exhausted' | 'broke' | 'profit_goal' | 'stop_loss'
}

// Player update for batch operations
export interface PlayerUpdate {
  id: string
  balance: string
  status: PlayerStatus
}

// Simulation summary returned by API
export interface SimulationSummary {
  message: string
  currentHour?: string // Simulation hour that was just executed
  simulationTime?: string // ISO timestamp of simulation hour
  sessionsTriggered: number
  playersProcessed: number
  totalSpins: number
  houseRevenue: string
  playerStatuses?: {
    active: number
    idle: number
    broke: number
  }
}

// Archetype name type
export type ArchetypeName = 'Recreational' | 'VIP' | 'Bonus Hunter'
