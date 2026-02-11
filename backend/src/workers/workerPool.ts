/**
 * Worker pool manager for parallel simulation processing
 * Dynamically creates 1-4 workers based on player count
 */

import { Worker } from 'worker_threads'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Player } from '../models/player.js'
import { Session } from '../models/session.js'
import { WorkerTask, WorkerResponse, WorkerResult, PlayerSimulationResult } from './types.js'

/**
 * Get the path to the worker script
 * Handles both development (TypeScript) and production (JavaScript) environments
 */
function getWorkerScriptPath(): string {
  // In ES modules, use import.meta.url to get current file path
  const currentFilePath = fileURLToPath(import.meta.url)
  const currentDir = dirname(currentFilePath)

  // Try to find the compiled worker first (in dist/ directory)
  // This works both in production and when running tests with tsx
  const compiledWorkerPath = join(currentDir, '../../dist/workers/simulationWorker.js')

  // Check if running from src/ directory (development with tsx)
  if (currentFilePath.includes('/src/') || currentFilePath.includes('\\src\\')) {
    // Use compiled worker from dist/ if it exists
    // This avoids module resolution issues with .js extensions in .ts files
    return compiledWorkerPath
  }

  // Running from dist/ directory (production)
  return join(currentDir, 'simulationWorker.js')
}

/**
 * Worker pool for parallel player simulation
 * Manages lifecycle of worker threads and distributes work
 */
export class WorkerPool {
  private workers: Worker[] = []
  private workerCount: number

  /**
   * Create a new worker pool
   * @param workerCount - Number of workers to create (1-4)
   */
  constructor(workerCount: number) {
    if (workerCount < 1 || workerCount > 4) {
      throw new Error('Worker count must be between 1 and 4')
    }
    this.workerCount = workerCount
  }

  /**
   * Initialize worker threads
   * Creates worker instances and prepares them for tasks
   */
  private async initializeWorkers(): Promise<void> {
    const workerPath = getWorkerScriptPath()

    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(workerPath, {
        // Pass execArgv to support tsx in development
        execArgv: workerPath.endsWith('.ts') ? ['--import', 'tsx'] : []
      })
      this.workers.push(worker)
    }
  }

  /**
   * Execute simulation across all workers
   * Distributes players evenly and collects results
   *
   * @param players - All players to simulate
   * @param sessions - Corresponding sessions (same order as players)
   * @param globalSeed - Global RNG seed for determinism
   * @returns Array of results from all workers
   */
  async executeSimulation(
    players: Player[],
    sessions: Session[],
    globalSeed: string
  ): Promise<WorkerResult[]> {
    if (players.length !== sessions.length) {
      throw new Error('Players and sessions arrays must have same length')
    }

    if (players.length === 0) {
      return []
    }

    // Initialize workers if not already done
    if (this.workers.length === 0) {
      await this.initializeWorkers()
    }

    // Partition players into chunks for each worker
    const chunkSize = Math.ceil(players.length / this.workerCount)
    const chunks: { players: Player[]; sessions: Session[] }[] = []

    for (let i = 0; i < this.workerCount; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, players.length)

      if (start < players.length) {
        chunks.push({
          players: players.slice(start, end),
          sessions: sessions.slice(start, end)
        })
      }
    }

    // Send tasks to workers and collect results
    const promises = chunks.map((chunk, index) => {
      return this.runWorkerTask(this.workers[index], {
        type: 'SIMULATE_BATCH',
        players: chunk.players,
        sessions: chunk.sessions,
        globalSeed,
        workerIndex: index
      })
    })

    const results = await Promise.all(promises)

    // Check for errors
    const errors = results.filter(r => r.type === 'BATCH_ERROR')
    if (errors.length > 0) {
      const firstError = errors[0]
      throw new Error(
        `Worker ${firstError.workerIndex} failed: ${firstError.error}` +
        (firstError.playerId ? ` (player: ${firstError.playerId})` : '')
      )
    }

    return results as WorkerResult[]
  }

  /**
   * Run a task on a specific worker and wait for result
   * Includes timeout and error handling
   *
   * @param worker - Worker instance
   * @param task - Task to execute
   * @param timeout - Timeout in milliseconds (default: 5 minutes)
   * @returns Worker response
   */
  private runWorkerTask(
    worker: Worker,
    task: WorkerTask,
    timeout: number = 300000 // 5 minutes
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Worker ${task.workerIndex} timed out after ${timeout}ms`))
      }, timeout)

      // Set up message handler
      const messageHandler = (response: WorkerResponse) => {
        clearTimeout(timeoutId)
        worker.off('message', messageHandler)
        worker.off('error', errorHandler)
        resolve(response)
      }

      // Set up error handler
      const errorHandler = (err: Error) => {
        clearTimeout(timeoutId)
        worker.off('message', messageHandler)
        worker.off('error', errorHandler)
        reject(err)
      }

      worker.on('message', messageHandler)
      worker.on('error', errorHandler)

      // Send task to worker
      worker.postMessage(task)
    })
  }

  /**
   * Shut down all workers
   * Terminates worker threads and cleans up resources
   */
  async shutdown(): Promise<void> {
    const terminationPromises = this.workers.map(worker => worker.terminate())
    await Promise.all(terminationPromises)
    this.workers = []
  }
}

/**
 * Calculate optimal worker count based on player count
 * @param playerCount - Number of players to simulate
 * @returns Optimal number of workers (1-4)
 */
export function calculateWorkerCount(playerCount: number): number {
  if (playerCount <= 250) return 1
  if (playerCount <= 500) return 2
  if (playerCount <= 750) return 3
  return 4
}
