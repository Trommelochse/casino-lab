/**
 * Worker thread message protocol types
 * Defines communication between main thread and worker threads
 */

import { Player } from '../models/player.js'
import { Session } from '../models/session.js'
import { GameRound } from '../models/gameRound.js'
import { PlayerStatus } from '../models/player.js'

/**
 * Task sent from main thread to worker
 * Instructs worker to simulate a batch of players
 */
export interface WorkerTask {
  type: 'SIMULATE_BATCH'
  players: Player[]
  sessions: Session[]
  globalSeed: string
  workerIndex: number
}

/**
 * Result for a single player's simulation
 */
export interface PlayerSimulationResult {
  playerId: string
  finalBalance: string
  finalStatus: PlayerStatus
  rounds: GameRound[]
  exitReason: 'spins_exhausted' | 'broke' | 'profit_goal' | 'stop_loss'
}

/**
 * Success response from worker to main thread
 * Contains results for all players in the batch
 */
export interface WorkerResult {
  type: 'BATCH_COMPLETE'
  workerIndex: number
  results: PlayerSimulationResult[]
}

/**
 * Error response from worker to main thread
 */
export interface WorkerError {
  type: 'BATCH_ERROR'
  workerIndex: number
  error: string
  playerId?: string
}

/**
 * Union type for all worker messages
 */
export type WorkerMessage = WorkerTask

/**
 * Union type for all worker responses
 */
export type WorkerResponse = WorkerResult | WorkerError
