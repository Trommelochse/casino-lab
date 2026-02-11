/**
 * Worker thread script for parallel player simulation
 * Processes batches of players independently to avoid blocking main thread
 */

import { parentPort } from 'worker_threads'
import { WorkerTask, WorkerResult, WorkerError, PlayerSimulationResult } from './types.js'
import { executeMicroBetLoop } from '../simulation/microBetLoop.js'
import { calculateSpinsPerHour } from '../simulation/betCalculator.js'
import { createRng } from '../services/rng.js'
import { initSlotRegistry, buildSlotRegistry } from '../slots/slotRegistry.js'
import slotModelsConfig from '../slots/slotModels.config.js'

// Initialize slot registry in worker context
const registry = buildSlotRegistry(slotModelsConfig)
initSlotRegistry(registry)

/**
 * Process a batch of players through micro-bet loops
 * Runs in worker thread context
 */
function processBatch(task: WorkerTask): WorkerResult | WorkerError {
  const { players, sessions, globalSeed, simulationTimestamp, workerIndex } = task

  try {
    const results: PlayerSimulationResult[] = []

    // Create worker-specific RNG seed for determinism
    const workerSeed = `${globalSeed}-worker-${workerIndex}`
    const workerRng = createRng(workerSeed)

    // Process each player in the batch
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const session = sessions[i]

      try {
        // Create player-specific RNG seed
        const playerSeed = `${workerSeed}-${player.id}`
        const playerRng = createRng(playerSeed)

        // Calculate spins for this hour
        const spinsPerHour = calculateSpinsPerHour(
          player.archetype as 'Recreational' | 'VIP' | 'Bonus Hunter',
          playerRng
        )

        // Execute micro-bet loop
        const loopResult = executeMicroBetLoop({
          player,
          session,
          spinsPerHour,
          rng: playerRng,
          simulationTimestamp
        })

        // Store result
        results.push({
          playerId: player.id,
          finalBalance: loopResult.finalBalance,
          finalStatus: loopResult.finalStatus,
          rounds: loopResult.rounds,
          exitReason: loopResult.exitReason
        })
      } catch (err) {
        // Player-level error - return error for this specific player
        return {
          type: 'BATCH_ERROR',
          workerIndex,
          error: (err as Error).message,
          playerId: player.id
        }
      }
    }

    // Return successful batch result
    return {
      type: 'BATCH_COMPLETE',
      workerIndex,
      results
    }
  } catch (err) {
    // Batch-level error - could not process any players
    return {
      type: 'BATCH_ERROR',
      workerIndex,
      error: (err as Error).message
    }
  }
}

/**
 * Message handler for worker thread
 * Listens for tasks from main thread and processes them
 */
if (parentPort) {
  parentPort.on('message', (task: WorkerTask) => {
    if (task.type === 'SIMULATE_BATCH') {
      const result = processBatch(task)
      parentPort!.postMessage(result)
    }
  })
} else {
  throw new Error('simulationWorker must be run as a worker thread')
}
