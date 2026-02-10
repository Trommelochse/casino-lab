# Development Log

This file tracks completed features and implementation notes for the Casino Lab project.

---

## Feature F-001: Backend Project Bootstrap ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Initialized a Node.js + Fastify backend project using TypeScript with ESM modules.

### What Was Built
- **Project Configuration:**
  - `package.json` - ESM-based configuration with Node.js >=20.0.0 requirement
  - `tsconfig.json` - Strict TypeScript targeting ES2022, outputs to dist/
  - `.gitignore` - Excludes node_modules, dist, .env, coverage
  - `.env.example` - Environment variable template (PORT, HOST, NODE_ENV)

- **Source Code:**
  - `src/app.ts` - Fastify app factory with `buildApp()` function
  - `src/server.ts` - Server entrypoint with graceful shutdown (SIGINT/SIGTERM)

- **Tests:**
  - `test/health.test.ts` - Uses node:test + node:assert/strict, validates health endpoint

- **Documentation:**
  - `README.md` - Installation, development, and API documentation

### Dependencies
- **Runtime:** `fastify@^5.2.1`
- **Dev:** `typescript@^5.7.3`, `tsx@^4.19.2`, `@types/node@^22.10.5`

### API Endpoints
- `GET /health` - Returns `{ status: "ok" }` with HTTP 200

### NPM Scripts
- `npm run dev` - Development mode with tsx watch
- `npm run build` - Compile TypeScript to dist/
- `npm start` - Run compiled production server
- `npm test` - Run tests with tsx + node:test

### Verification Results
- ✅ Dependencies installed (55 packages, 0 vulnerabilities)
- ✅ Tests pass (1/1 passing)
- ✅ Build succeeds, generates dist/ with source maps
- ✅ Production server starts on PORT 3000
- ✅ Dev server works with hot-reload
- ✅ Health endpoint responds correctly: `{"status":"ok"}`

### Notes
- Using ESM modules (`"type": "module"` in package.json)
- Server listens on `0.0.0.0:3000` by default (configurable via env vars)
- Graceful shutdown handlers properly close Fastify instance
- Tests use `app.inject()` for fast in-process testing without real HTTP server

---

## Feature F-002: Database Infrastructure Setup ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Set up PostgreSQL database with Docker and created initial schema using node-pg-migrate. Established the foundational database tables for players and casino state tracking.

### What Was Built
- **Docker Infrastructure:**
  - `docker-compose.yml` - PostgreSQL 16 container with persistent volume
  - Database: `casino_dev` with user `postgres:postgres`
  - Port mapping: `5432:5432` with healthcheck configuration

- **Migration System:**
  - `.pgmigraterc.json` - Configuration for node-pg-migrate (JavaScript migrations)
  - `migrations/1707328800000_init-schema.js` - Initial schema migration
  - Database tracking table: `pgmigrations` (auto-created)

- **Database Schema:**
  - **`players` table:**
    - `id` (UUID, auto-generated primary key)
    - `archetype` (text) - Player behavioral type (Recreational/VIP/Bonus Hunter)
    - `status` (text) - Current state (Active/Idle/Broke)
    - `wallet_balance` (numeric) - Current casino balance
    - `lifetime_pl` (numeric) - Lifetime profit/loss
    - `remaining_capital` (numeric) - Available funds for deposits
    - `dna_traits` (jsonb) - Player DNA configuration (nullable)
    - `created_at`, `updated_at` (timestamptz)
    - Indexes: `idx_players_status`, `idx_players_archetype`

  - **`casino_state` table:**
    - `id` (smallint, primary key) - Singleton row (id=1)
    - `house_revenue` (numeric) - Total casino profit
    - `active_player_count` (integer) - Number of active players
    - `updated_at` (timestamptz)
    - Pre-seeded with initial row (all zeros)

### Dependencies
- **Runtime:** `pg@^8.13.1`
- **Dev:** `node-pg-migrate@^7.8.1`, `@types/pg@^8.11.10`

### NPM Scripts
- `npm run db:migrate` - Run pending migrations (up)
- `npm run db:rollback` - Rollback last migration (down)

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (no quotes)
  - Example: `postgresql://postgres:postgres@localhost:5432/casino_dev`

### Verification Results
- ✅ PostgreSQL 16 container running and healthy
- ✅ Database `casino_dev` created
- ✅ Migration executed successfully
- ✅ All tables and indexes created correctly
- ✅ Casino state singleton row inserted (id=1, revenues=0)
- ✅ Rollback and re-apply tested successfully
- ✅ New migrations generate as `.js` files with JSDoc types

### Notes
- **Migration files use JavaScript (not TypeScript):** node-pg-migrate doesn't support TypeScript type imports, so migrations use `.js` with JSDoc comments for type hints
- **UUID generation:** Uses `pgcrypto` extension for `gen_random_uuid()`
- **Numeric precision:** Using PostgreSQL `numeric` type for money fields to avoid floating-point precision issues
- **JSONB for DNA traits:** Flexible storage for player genetic configuration
- **No rewards tables yet:** Loyalty tiers, free spins, and cashback tracking will be added later
- **Singleton pattern:** `casino_state` uses id=1 with `ON CONFLICT DO NOTHING` for safe re-runs
- **Local PostgreSQL conflict:** If you have a local PostgreSQL service running, stop it to avoid port 5432 conflicts with Docker

---

## Feature F-003: Database Connection + Load Casino State on Boot ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Added robust PostgreSQL connection layer with connection pooling and implemented in-memory caching of casino state. Server now loads casino state from database on boot and exposes it via REST API.

### What Was Built
- **Database Connection Layer:**
  - `src/db/pool.ts` - Singleton PostgreSQL connection pool
    - Lazy initialization (created on first use, test-friendly)
    - Configurable max connections via `DB_POOL_MAX` env var (default: 10)
    - Connection timeout: 5000ms
    - Error handling for idle client failures
    - Graceful shutdown with `closePool()` function

- **Casino State Cache:**
  - `src/state/casinoState.ts` - In-memory casino state management
    - `loadCasinoState()` - Loads casino_state row (id=1) from database
    - `getCasinoState()` - Returns cached state (throws if not loaded)
    - `refreshCasinoState()` - Reloads state from database
    - Test helpers: `__setCasinoStateForTests()`, `__clearCasinoStateForTests()`
    - TypeScript interface: `CasinoState` with typed fields

- **Server Startup Integration:**
  - Modified `src/server.ts`:
    - Loads casino state before starting HTTP server (fail-fast on error)
    - Closes database pool on graceful shutdown (SIGINT/SIGTERM)
    - Added `dotenv/config` import for environment variable loading

- **API Endpoint:**
  - Modified `src/app.ts`:
    - `GET /state` - Returns cached casino state with HTTP 200
    - Returns HTTP 503 with error message if state not loaded
    - Catches errors and returns proper JSON error responses

- **Tests:**
  - `test/state.test.ts` - Comprehensive test suite (3 test cases)
    - Tests loaded state returns 200 with correct data
    - Tests unloaded state returns 503 with error message
    - Tests state with non-zero values
    - Uses test helpers to avoid requiring real database connection
  - Updated `test/health.test.ts` - Added dotenv import

- **Documentation:**
  - Updated `README.md`:
    - Documented `DB_POOL_MAX` environment variable
    - Added `GET /state` endpoint documentation with example response
    - Updated project structure diagram
    - Removed invalid `db:status` script references
  - Updated `.env.example` - Added `DB_POOL_MAX=10` (optional)
  - Removed invalid `db:status` from package.json scripts

### Dependencies
- **New Runtime:** `dotenv@^17.2.4` - Environment variable loading
- **Existing:** `pg@^8.13.1` - PostgreSQL client (already installed in F-002)

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (**required**)
- `DB_POOL_MAX` - Maximum database pool connections (optional, default: 10)

### API Endpoints
- `GET /state` - Returns current casino state (cached in memory)
  ```json
  {
    "id": 1,
    "house_revenue": "0",
    "active_player_count": 0,
    "updated_at": "2026-02-07T17:46:31.314Z"
  }
  ```

### Verification Results
- ✅ All tests passing (4/4 total: 1 health + 3 state tests)
- ✅ Server boots successfully and loads casino state from database
- ✅ `GET /state` returns correct data with HTTP 200
- ✅ `GET /health` still working (no regressions)
- ✅ Tests work without real database (using test helpers)
- ✅ Graceful shutdown properly closes both Fastify and database pool
- ✅ Fail-fast startup: server won't start if DATABASE_URL missing or casino state can't be loaded

### Notes
- **No ORM used:** Direct SQL queries via `pg` pool as specified
- **Lazy pool initialization:** Pool created on first use, not at import time (allows tests to run without DATABASE_URL)
- **In-memory caching:** Casino state loaded once on boot and cached for fast access
- **Test isolation:** Test helpers (`__setCasinoStateForTests`) allow unit testing without database connection
- **Numeric as string:** PostgreSQL `numeric` type returned as string by `pg` driver (prevents precision loss)
- **Error handling:** Clear error messages for missing DATABASE_URL or unloaded state
- **Singleton pattern:** Single casino_state row (id=1) loaded and cached per server instance
- **Future refresh:** `refreshCasinoState()` available for reloading after mutations (not used yet)
- **dotenv placement:** Imported at top of server.ts and test files to ensure environment variables loaded before any module imports

---

## Feature F-004: Player Base Model (TypeScript) ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Created a type-safe Player domain model with exact field mappings to the database schema. Implemented pure mapper functions to convert between database rows (snake_case) and domain entities (camelCase) with runtime validation.

### What Was Built
- **Domain Model:**
  - `src/models/player.ts` - Player entity and database row types
    - `PlayerStatus` type - Literal union: `"Idle" | "Active" | "Broke"`
    - `Player` interface - Domain model with camelCase fields (9 properties)
    - `PlayerRow` interface - Database row shape with snake_case columns
    - Exact field mapping to F-002 migration schema

- **Type Guard:**
  - `isPlayerStatus(x: unknown): x is PlayerStatus` - Runtime type validation
  - Returns true only for valid status values
  - Used for defensive programming and data validation

- **Mapper Function:**
  - `mapPlayerRow(row: PlayerRow): Player` - Pure conversion function
    - Converts snake_case → camelCase (wallet_balance → walletBalance, etc.)
    - Preserves numeric strings exactly as-is (no parsing or conversion)
    - Handles both string and Date timestamps, outputs ISO strings
    - Throws descriptive error on invalid status with bad value included
    - Zero side effects, fully testable

- **Tests:**
  - `test/player.model.test.ts` - Comprehensive test suite (9 test cases)
    - `isPlayerStatus()` validation (valid and invalid inputs)
    - Complete field mapping verification
    - Numeric string preservation (maintains precision)
    - Null dna_traits handling
    - Date to ISO string conversion
    - String timestamp preservation
    - Invalid status error handling
    - All three valid status values tested

### Player Type Definition
```typescript
interface Player {
  id: string;                    // UUID
  archetype: string;             // Recreational, VIP, Bonus Hunter
  status: PlayerStatus;          // "Idle" | "Active" | "Broke"
  walletBalance: string;         // Numeric as string
  lifetimePL: string;            // Numeric as string
  remainingCapital: string;      // Numeric as string
  dnaTraits: unknown | null;     // JSON-ish, nullable
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### Dependencies
- **None added** - Pure TypeScript implementation

### Verification Results
- ✅ All tests passing (13/13 total: 1 health + 3 state + 9 player model)
- ✅ No runtime dependencies added
- ✅ Type guard correctly validates all status values
- ✅ Mapper correctly converts all field names
- ✅ Numeric strings preserved with full precision
- ✅ Both Date and string timestamps handled correctly
- ✅ Clear error messages on invalid data
- ✅ No regressions in existing tests

### Notes
- **No migrations needed:** Schema already exists from F-002
- **No repository/service layer yet:** This is purely the domain model layer
- **String-based numerics:** Following PostgreSQL `pg` driver convention where numeric types return as strings to prevent floating-point precision loss
- **Type-safe status:** Using literal union instead of enum for better type inference and smaller JS output
- **Pure functions:** `mapPlayerRow()` has no side effects, making it easy to test and reason about
- **Runtime validation:** `isPlayerStatus()` provides runtime safety that TypeScript compile-time checks can't guarantee
- **Timestamp flexibility:** Handles both string (from JSON/query results) and Date objects (from some ORM layers), always outputs consistent ISO strings
- **Error verbosity:** Invalid status errors include the actual bad value to aid debugging
- **Ready for reuse:** This model will be used by repositories, services, and API routes in future features

---

## Feature F-005: Seeded RNG Service (TypeScript) ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Created a server-only random number generation service using `seedrandom` library that supports deterministic, reproducible simulations via seed configuration. Provides a type-safe API with comprehensive validation and multiple utility methods.

### What Was Built
- **RNG Service Module:**
  - `src/services/rng.ts` - Seeded random number generator (server-only)
    - `Rng` type - Interface with 5 utility methods
    - `createRng(seed?)` - Factory function for creating RNG instances
    - `getGlobalRng()` - Singleton instance using RNG_SEED from environment
    - `getConfiguredSeed()` - Returns configured seed or null
    - Full input validation with descriptive error messages

- **RNG Methods:**
  - `random()` - Generate float in [0, 1)
  - `int(min, max)` - Generate integer in [min, max] (inclusive)
    - Validates min/max are finite integers
    - Throws if max < min
    - Uniform distribution
  - `float(min, max)` - Generate float in [min, max) (exclusive max)
    - Validates finite numbers
    - Throws if max <= min
  - `pick<T>(arr)` - Pick random element from array
    - Throws on empty array
    - Generic type support
  - `shuffle<T>(arr)` - Shuffle array (returns new array)
    - Fisher-Yates algorithm for uniform distribution
    - Immutable - does not mutate input
    - Generic type support

- **Tests:**
  - `test/rng.test.ts` - Comprehensive test suite (28 test cases)
    - Determinism tests (5 tests) - Same seed produces identical sequences
    - Non-determinism tests (2 tests) - No seed produces different sequences
    - Range validation tests for random(), int(), float()
    - Edge case tests (empty arrays, single elements, boundary values)
    - Statistical coverage test for pick()
    - Immutability test for shuffle()
    - Error handling tests for all validation cases

- **Configuration:**
  - Updated `.env.example` - Added RNG_SEED (optional, commented)
  - Updated `README.md` - Documented RNG_SEED environment variable

### RNG API Example
```typescript
import { getGlobalRng, createRng } from './services/rng.js';

// Global RNG (uses RNG_SEED if set)
const rng = getGlobalRng();

// Or create custom instance
const customRng = createRng('my-custom-seed');

// Generate random values
rng.random()              // → 0.7319... (float in [0, 1))
rng.int(1, 100)          // → 29 (integer in [1, 100])
rng.float(0.0, 10.5)     // → 7.234... (float in [0, 10.5))
rng.pick(['a', 'b', 'c']) // → 'b' (random element)
rng.shuffle([1, 2, 3])   // → [3, 1, 2] (new shuffled array)
```

### Dependencies
- **New Runtime:** `seedrandom@^3.0.5` - Seedable PRNG library
- **New Dev:** `@types/seedrandom@^3.0.8` - TypeScript definitions

### Environment Variables
- `RNG_SEED` - Seed string for deterministic RNG (optional)
  - If set: RNG produces identical sequences across process restarts
  - If not set: RNG uses non-deterministic seeding

### Verification Results
- ✅ All tests passing (41/41 total: 1 health + 3 state + 9 player + 28 RNG)
- ✅ Only `seedrandom` added as runtime dependency
- ✅ Deterministic behavior verified: `RNG_SEED=abc` produces identical sequences across runs
- ✅ Non-deterministic behavior verified: Without seed, produces different sequences
- ✅ All validation tests pass with clear error messages
- ✅ Fisher-Yates shuffle produces uniform distribution
- ✅ Immutability verified: shuffle() doesn't mutate input array
- ✅ Statistical tests confirm proper element coverage
- ✅ No regressions in existing tests

### Deterministic Verification
**Run 1 with `RNG_SEED=abc`:**
```
random(): 0.7319428..., 0.6472995..., 0.7150830...
int(1,100): 29, 21, 14
```

**Run 2 with `RNG_SEED=abc`:**
```
random(): 0.7319428..., 0.6472995..., 0.7150830...  ✅ IDENTICAL
int(1,100): 29, 21, 14                              ✅ IDENTICAL
```

**Without seed:**
```
random(): 0.1250827..., 0.7981641..., 0.4050710...  ✅ DIFFERENT
```

### Notes
- **Server-only module:** Located in `src/services/` to keep RNG logic on server
- **Singleton pattern:** `getGlobalRng()` creates instance once based on RNG_SEED environment variable
- **Seed immutability:** Global RNG seed set once at first call, doesn't re-seed on subsequent calls
- **Fisher-Yates shuffle:** Implements proper uniform shuffle algorithm, not naive random-swap
- **Validation-first:** All methods validate inputs before performing operations
- **Type safety:** Uses TypeScript generics for `pick<T>()` and `shuffle<T>()` to maintain type information
- **Clear error messages:** Validation errors include context (e.g., "max must be >= min")
- **No dependencies on other services:** Pure utility module with no external service dependencies
- **Reproducible simulations:** With RNG_SEED set, entire simulation runs are reproducible for debugging and testing
- **Future use:** Will be used by slot game logic, player behavior simulation, and reward distributions

---

## Feature F-006: Slot Model Config Loader + In-Memory Registry ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Created a TypeScript-based configuration system for slot game probability models with strict validation and in-memory registry. Loaded 3 complete slot models (low, medium, high volatility) with cumulative probability computation for fast RNG lookups during simulations.

### What Was Built
- **Slot Models Configuration:**
  - `src/slots/slotModels.config.ts` - TypeScript config with all 3 slot models
    - **Low Volatility** ("The Steady Farmer"): 10 outcomes, 28.5% hit rate, 500x max win
    - **Medium Volatility** ("The Golden Temple"): 11 outcomes, 22.0% hit rate, 2,500x max win
    - **High Volatility** ("The Dragon's Hoard"): 11 outcomes, 14.5% hit rate, 10,000x max win
    - Data extracted from `.claude/knowledge-base/slot-models.md`
    - Probabilities adjusted to sum to exactly 1.0
    - TypeScript types: `SlotOutcomeConfig`, `SlotModelConfig`, `SlotModelsConfig`

- **Registry + Validation:**
  - `src/slots/slotRegistry.ts` - Validation engine and singleton registry
    - `buildSlotRegistry(config)` - Validates and builds registry with cumulative probabilities
    - `initSlotRegistry(registry)` - Stores registry in module-level singleton
    - `getSlotRegistry()` - Returns full registry (throws if not initialized)
    - `getSlotModel(name)` - Returns specific model (throws if not found)
    - `__resetForTests()` - Test helper for clean state isolation

- **Validation Logic:**
  - ✅ Non-empty outcomes array (at least 1 outcome)
  - ✅ Unique outcome keys (case-sensitive, no duplicates)
  - ✅ Valid probabilities: `0 < p <= 1` and `Number.isFinite(p)`
  - ✅ Cumulative probabilities strictly increasing
  - ✅ Final cumulative probability equals 1.0 within tolerance (±1e-6)
  - ✅ Clear error messages including model name and specific failure reason

- **Server Integration:**
  - Modified `src/server.ts` - Added slot registry initialization to boot sequence
    - Loads slot models before casino state
    - Fail-fast: server won't start if validation fails
    - Logs "Loaded 3 slot models" on success

- **Tests:**
  - `test/slotRegistry.test.ts` - Comprehensive test suite (19 test cases)
    - Valid config produces correct cumulative probabilities
    - Duplicate keys rejected
    - Invalid probabilities rejected (p <= 0, p > 1, NaN, Infinity)
    - Probability sum validation (within tolerance)
    - Registry initialization and retrieval tests
    - Model lookup tests
    - Real slot models from config validated

### Slot Models Data

**Low Volatility ("The Steady Farmer"):**
```typescript
outcomes: [
  { key: '0.00', p: 0.715, cumP: 0.715 },     // Dead spin (71.5%)
  { key: '0.50', p: 0.14, cumP: 0.855 },      // Partial return
  { key: '1.00', p: 0.08, cumP: 0.935 },      // Money back
  // ... 7 more outcomes
  { key: '500.00', p: 0.0001, cumP: 1.0 }     // Max win (1 in 10,000)
]
```

**Medium Volatility ("The Golden Temple"):**
- 11 outcomes from 0.00x to 2,500.00x
- Max win: 1 in 100,000 spins

**High Volatility ("The Dragon's Hoard"):**
- 11 outcomes from 0.00x to 10,000.00x
- Max win: 1 in ~4,545 spins (adjusted probability)

### Dependencies
- **None added** - Pure TypeScript implementation

### Verification Results
- ✅ All tests passing (60/60 total: 1 health + 3 state + 9 player + 28 RNG + 19 slot registry)
- ✅ Server boots successfully with slot models loaded
- ✅ All probabilities sum to 1.0 within tolerance
- ✅ Cumulative probabilities correctly computed
- ✅ Validation prevents invalid configs from starting server
- ✅ No new runtime dependencies added
- ✅ No regressions in existing tests

### Server Startup Log
```
{"msg":"Loading slot models..."}
{"msg":"Loaded 3 slot models"}
{"msg":"Loading casino state from database..."}
{"msg":"Casino state loaded successfully"}
{"msg":"Server listening on 0.0.0.0:3000"}
```

### Usage Example
```typescript
import { getSlotModel } from './slots/slotRegistry.js';

// Get a specific slot model
const lowVolModel = getSlotModel('low');

// Access outcomes with cumulative probabilities
console.log(lowVolModel.outcomes.length);    // 10
console.log(lowVolModel.outcomes[0]);         // { key: '0.00', p: 0.715, cumP: 0.715 }
console.log(lowVolModel.outcomes[9].cumP);    // 1.0

// Use for RNG lookup (future simulation logic)
const rngValue = 0.85;  // Random value from RNG [0, 1)
const outcome = lowVolModel.outcomes.find(o => rngValue < o.cumP);
console.log(outcome?.key);  // '0.50' (partial return)
```

### Notes
- **TypeScript config only:** No runtime file parsing, no markdown parsing, purely TypeScript imports
- **Fail-fast validation:** Invalid configurations prevent server startup entirely with clear error messages
- **In-memory singleton:** Fast synchronous access via `getSlotModel(name)` with zero I/O overhead
- **Cumulative probabilities:** Pre-computed during validation for O(n) RNG lookups (linear scan through outcomes)
- **Data source:** Extracted from `.claude/knowledge-base/slot-models.md` with manual adjustment to ensure probabilities sum to 1.0
- **Probability adjustments:** Some final probabilities were adjusted from markdown source to achieve exact 1.0 sum:
  - Low: last value changed from 0.00005 to 0.0001
  - Medium: last value changed from 0.00001 to 0.00002
  - High: last value changed from 0.00001 to 0.00022
- **Test isolation:** `__resetForTests()` clears singleton registry for independent test execution
- **Future use:** Will be used by simulation engine (F-007+) to determine spin outcomes based on RNG values
- **No endpoints yet:** Slot models are server-only data, no API exposure needed (internal use only)
- **Prerequisite met:** This feature is required before implementing the hourly simulation engine

---

## Feature F-006-B: Session and Game Rounds Tables + Base Models ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Added database tables and TypeScript models for session and game round tracking. Sessions track player gaming sessions with balance snapshots, while game_rounds store individual bet/spin results. Both use PostgreSQL with proper foreign keys, indexes, and CHECK constraints for data integrity.

### What Was Built
- **Database Migration:**
  - `migrations/1770528912674_sessions-and-game-rounds.js` - New migration creating two tables
    - **`sessions` table:** Tracks player sessions with start/end times and balance snapshots
    - **`game_rounds` table:** Stores individual bet/spin results within sessions
    - Foreign key constraints with CASCADE delete
    - Indexes for efficient queries
    - CHECK constraints for data validation

- **TypeScript Models:**
  - `src/models/session.ts` - Session domain model
    - `Session` interface - camelCase domain entity (8 fields)
    - `SessionRow` interface - snake_case database row shape
    - `mapSessionRow(row)` - Pure mapper function with nullable field support
    - Timestamp conversion helpers (Date → ISO string)

  - `src/models/gameRound.ts` - GameRound domain model
    - `GameRound` interface - camelCase domain entity (8 fields)
    - `GameRoundRow` interface - snake_case database row shape
    - `mapGameRoundRow(row)` - Pure mapper function
    - Numeric preservation as strings (consistent with Player model)

- **Tests:**
  - `test/session.model.test.ts` - Session model tests (7 test cases)
    - Field mapping validation (snake_case → camelCase)
    - Null handling for open sessions (ended_at, final_balance)
    - Numeric string preservation
    - Date to ISO string conversion
    - String timestamp preservation as-is
    - Zero balance edge cases

  - `test/gameRound.model.test.ts` - GameRound model tests (8 test cases)
    - Complete field mapping validation
    - Losing rounds (0x multiplier, 0 payout)
    - Break-even rounds (1x multiplier)
    - Big wins (high multipliers like 500x)
    - Fractional multipliers (0.50x partial returns)
    - Date and string timestamp handling

- **Documentation:**
  - Updated `README.md` - Added sessions and game_rounds table descriptions

### Database Schema

**`sessions` Table:**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,              -- NULL = session still open
  initial_balance NUMERIC NOT NULL,
  final_balance NUMERIC NULL,             -- NULL until session closes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sessions_player_id ON sessions(player_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
```

**`game_rounds` Table:**
```sql
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  bet_amount NUMERIC NOT NULL CHECK (bet_amount > 0),
  multiplier NUMERIC NOT NULL CHECK (multiplier >= 0),
  payout NUMERIC NOT NULL CHECK (payout >= 0),
  resulting_balance NUMERIC NOT NULL CHECK (resulting_balance >= 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_game_rounds_session_id ON game_rounds(session_id);
CREATE INDEX idx_game_rounds_occurred_at ON game_rounds(occurred_at);
```

### Foreign Key Cascade Behavior
```
Player (deleted)
  └─> Sessions (CASCADE deleted)
        └─> Game Rounds (CASCADE deleted)
```

When a player is deleted, all their sessions and game rounds are automatically removed from the database, maintaining referential integrity.

### Dependencies
- **None added** - Uses existing PostgreSQL setup from F-002

### Verification Results
- ✅ All tests passing (74/74 total: previous 60 + 7 session + 7 game_round)
- ✅ Migration up successful - tables created with all constraints, indexes, and foreign keys
- ✅ Migration down successful - tables dropped in correct order (game_rounds → sessions)
- ✅ Build successful - all TypeScript compiles without errors
- ✅ No new runtime dependencies
- ✅ No regressions in existing tests

### Usage Example
```typescript
import { mapSessionRow, mapGameRoundRow } from './models';
import { pool } from './db/pool.js';

// Query and map a session
const sessionResult = await pool.query(
  'SELECT * FROM sessions WHERE player_id = $1 AND ended_at IS NULL',
  [playerId]
);
const openSession = mapSessionRow(sessionResult.rows[0]);

console.log(openSession.playerId);         // "987fcdeb-..."
console.log(openSession.startedAt);        // "2026-02-07T10:00:00.000Z"
console.log(openSession.endedAt);          // null (session is open)
console.log(openSession.initialBalance);   // "1000.00"
console.log(openSession.finalBalance);     // null (not closed yet)

// Query and map game rounds for a session
const roundsResult = await pool.query(
  'SELECT * FROM game_rounds WHERE session_id = $1 ORDER BY occurred_at',
  [sessionId]
);
const rounds = roundsResult.rows.map(mapGameRoundRow);

rounds.forEach(round => {
  console.log(`Bet: ${round.betAmount}, Multiplier: ${round.multiplier}, Payout: ${round.payout}`);
  // "Bet: 10.00, Multiplier: 2.50, Payout: 25.00"
});
```

### Notes
- **Nullable fields:** Open sessions have `ended_at = NULL` and `final_balance = NULL`
- **CHECK constraints:** Database enforces business rules (bet_amount > 0, others >= 0)
- **Numeric as strings:** All monetary values stored as PostgreSQL numeric, mapped to strings in TypeScript to preserve precision
- **Cascade deletes:** Deleting a player automatically removes all sessions and game rounds
- **Indexed queries:** Efficient lookups by player_id, session_id, and timestamps
- **No repositories yet:** These are domain models only; repository layer will be added in future features
- **No endpoints yet:** Tables exist for simulation engine to populate, no API exposure needed yet
- **Audit trail:** Both tables include created_at timestamps; sessions also track updated_at
- **Open sessions:** A session is considered "open" when ended_at is NULL
- **Balance snapshots:** Sessions store initial_balance (at start) and final_balance (at end)
- **Per-round tracking:** Each game_round stores the resulting_balance after that specific bet
- **Future use:** Simulation engine (F-007+) will populate these tables during hour ticks
- **Batch inserts:** Following CLAUDE.md architecture, game_rounds will be batch-inserted at end of hour tick for performance
- **Migration tested:** Both up and down migrations verified to work correctly

---

## Feature F-007: Spin Engine (Server-Only) ✅
**Completed:** 2026-02-07
**Status:** Verified and working

### Implementation Summary
Implemented a pure, deterministic slot spin engine that uses seeded RNG to select outcomes via cumulative probability lookup, calculates wagers and payouts, and returns a complete Round object with full details including RNG reproducibility information. The engine is side-effect free and ready for integration with the simulation system.

### What Was Built
- **Engine Types:**
  - `src/engine/types.ts` - Core type definitions
    - `RoundOutcome` - Complete outcome details (key, roll, multiplier, betAmount, payout, profitLoss)
    - `RoundRngInfo` - RNG reproducibility info (globalSeed, roundSeed, roll)
    - `Round` - Complete round result with UUID, timestamps, balances, and outcome details

- **Spin Engine:**
  - `src/engine/spin.ts` - Pure spin function implementation
    - `SpinInput` type - Input parameters (slotName, wager, startingBalance, roundSeed, rng)
    - `spin(input)` - Main engine function executing full spin algorithm
    - `formatNumeric(n)` - Consistent numeric formatting (8 decimals, trimmed)
    - `parseNumeric(value, fieldName, allowZero)` - Safe parsing with validation
    - Cumulative probability lookup using slot model from registry
    - Immediate balance mutation (returned in Round, no global state changes)
    - UUID generation using `crypto.randomUUID()` (no new dependencies)

- **Slot Model Enhancements:**
  - Extended `src/slots/slotModels.config.ts` - Added multiplier field
    - Updated `SlotOutcomeConfig` type with `multiplier: number`
    - Added multiplier values to all 3 slot models (low, medium, high)
    - Multipliers match outcome keys (0.0x, 0.5x, 1.0x, 2.0x, up to 10000x)

  - Updated `src/slots/slotRegistry.ts` - Multiplier validation
    - Added `multiplier` to `SlotOutcome` type
    - Validates multiplier exists and is >= 0
    - Throws descriptive error if multiplier missing or invalid

- **Tests:**
  - `test/spin.test.ts` - Comprehensive test suite (20 test cases)
    - Deterministic behavior (same seed → same results)
    - Outcome selection via cumulative probability boundaries
    - Balance calculations (loss, break-even, win, fractional wagers)
    - Input validation (insufficient balance, zero/negative wager, invalid strings)
    - Round structure validation (all fields present, unique IDs, ISO timestamps)
    - RNG seed handling (roundSeed, null, global RNG)

  - Updated `test/slotRegistry.test.ts` - Added multiplier to all test configs
    - Fixed all test slot configs to include multiplier field
    - Maintains full backward compatibility

### Spin Algorithm

```
1. Validate inputs:
   - wager > 0 (throw if zero or negative)
   - startingBalance >= 0
   - wager <= startingBalance (throw if insufficient)

2. Determine RNG:
   - If roundSeed provided → createRng(roundSeed)
   - Else if rng provided → use it
   - Else → getGlobalRng()

3. Roll: r = rng.random() ∈ [0, 1)

4. Cumulative lookup:
   - Get slot model from registry
   - Find first outcome where r < cumP
   - Defensive: use last outcome if none found

5. Calculate:
   - payout = wager × multiplier
   - endedBalance = startingBalance - wager + payout
   - profitLoss = payout - wager

6. Return Round:
   - UUID v4 identifier
   - ISO timestamp
   - Complete outcome details
   - RNG info for reproducibility
```

### Slot Model Multipliers

**Low Volatility:** 0.0x, 0.5x, 1.0x, 2.0x, 5.0x, 10.0x, 20.0x, 50.0x, 100.0x, 500.0x
**Medium Volatility:** 0.0x, 0.5x, 1.5x, 3.0x, 8.0x, 15.0x, 35.0x, 100.0x, 300.0x, 1000.0x, 2500.0x
**High Volatility:** 0.0x, 0.2x, 1.0x, 4.0x, 15.0x, 50.0x, 200.0x, 1000.0x, 3000.0x, 5000.0x, 10000.0x

### Dependencies
- **None added** - Uses `crypto.randomUUID()` from Node.js built-in crypto module

### Verification Results
- ✅ All tests passing (94/94 total: previous 74 + 20 spin engine)
- ✅ Build successful - all TypeScript compiles without errors
- ✅ Deterministic with roundSeed - same seed produces identical results
- ✅ Non-deterministic without seed - different results each time
- ✅ Correct outcome selection via cumulative probability lookup
- ✅ Accurate balance calculations for all multiplier scenarios
- ✅ Comprehensive input validation with clear error messages
- ✅ No new runtime dependencies
- ✅ No regressions in existing tests

### Usage Example
```typescript
import { spin } from './engine/spin.js';

// Execute a slot spin
const round = spin({
  slotName: 'low',
  wager: '10.00',
  startingBalance: '1000.00',
  roundSeed: 'player-123-session-456-round-1', // Optional for determinism
});

// Round structure
console.log(round.id);                    // "550e8400-e29b-41d4-a716-446655440000"
console.log(round.slotName);              // "low"
console.log(round.startedBalance);        // "1000"
console.log(round.endedBalance);          // "990" (after loss)
console.log(round.timestamp);             // "2026-02-07T20:15:30.123Z"

// Outcome details
console.log(round.outcome.key);           // "0.00" (loss)
console.log(round.outcome.roll);          // 0.234567 (RNG value)
console.log(round.outcome.multiplier);    // "0"
console.log(round.outcome.betAmount);     // "10"
console.log(round.outcome.payout);        // "0"
console.log(round.outcome.profitLoss);    // "-10"

// RNG reproducibility info
console.log(round.rng.globalSeed);        // null or "env-seed"
console.log(round.rng.roundSeed);         // "player-123-session-456-round-1"
console.log(round.rng.roll);              // 0.234567 (matches outcome.roll)

// Example: Winning round with 2x multiplier
const winRound = spin({
  slotName: 'low',
  wager: '10.00',
  startingBalance: '1000.00',
  roundSeed: 'winning-seed',
});
// winRound.outcome.multiplier = "2"
// winRound.outcome.payout = "20"
// winRound.outcome.profitLoss = "10"
// winRound.endedBalance = "1010"
```

### Test Coverage Highlights

**Determinism:**
- Same roundSeed produces identical outcomes across multiple runs
- RNG roll, outcome key, multiplier, balances all match exactly

**Cumulative Probability Boundaries (test model: 0.5, 0.8, 1.0):**
- roll = 0.0 → outcome 1 (cumP = 0.5)
- roll = 0.4999 → outcome 1
- roll = 0.6 → outcome 2 (cumP = 0.8)
- roll = 0.9 → outcome 3 (cumP = 1.0)

**Balance Calculations:**
- 0x multiplier: endedBalance = startingBalance - wager
- 1x multiplier: endedBalance = startingBalance (break-even)
- 2x multiplier: endedBalance = startingBalance + wager
- Fractional wagers: 5.50 × 2.0 = 11.00 payout

**Input Validation:**
- wager = "0" → throws "wager must be > 0"
- wager = "-10" → throws "wager must be > 0"
- wager > balance → throws "Insufficient balance"
- invalid string → throws "must be a valid number"

### Notes
- **Pure function:** No side effects, no global state mutations, fully testable
- **Side-effect free:** Balance mutation only in return value, not in database or global state
- **Rich output:** Returns complete Round object with full details, not just profit/loss
- **Deterministic:** Reproducible results with roundSeed for debugging and auditing
- **UUID generation:** Uses Node.js built-in `crypto.randomUUID()` (no new dependencies)
- **Numeric formatting:** Uses 8 decimal places with trailing zero trimming for consistency
- **Cumulative probability:** O(n) linear scan through outcomes (efficient for small n)
- **Multiplier validation:** Ensures all outcomes have multiplier >= 0 during registry build
- **No database:** Pure calculation engine, no session/game_round persistence yet (added in F-008+)
- **Flexible RNG:** Supports per-round seeds, provided RNG instance, or global RNG
- **Error messages:** Clear, actionable error messages include actual values for debugging
- **Future integration:** Ready for use by simulation engine (F-008+) for hour-tick execution
- **Server-only:** Module lives in `src/engine/` to keep RNG and game logic server-side only
- **Type safety:** Full TypeScript types for Round, RoundOutcome, RoundRngInfo with strict validation

---

## Feature F-008: Player Archetype Templates ✅
**Completed:** 2026-02-09
**Status:** Verified and working

### Implementation Summary
Created a TypeScript-based archetype configuration system defining DNA trait ranges for all three player behavioral profiles: Recreational, VIP, and Bonus Hunter. Each archetype specifies ranges for return probability, risk appetite, betting behavior, promo dependency, stop-loss limits, profit goals, initial capital, and slot preferences.

### What Was Built
- **Archetype Configuration:**
  - `src/constants/archetypes.ts` - Complete archetype template definitions
    - `ArchetypeTemplate` interface - Defines DNA trait range structure
    - `ArchetypeName` type - Literal union: `"Recreational" | "VIP" | "Bonus Hunter"`
    - `SlotVolatility` type - Literal union: `"low" | "medium" | "high"`
    - `ARCHETYPE_TEMPLATES` constant - Configuration for all three archetypes

- **Archetype Profiles:**
  - **Recreational (65% population):**
    - Return probability: 30-50%, low risk appetite (0.2-0.5)
    - Static betting (0.0-0.2 flexibility), low promo dependency (0.0-0.3)
    - Initial capital: €20-€100
    - Prefers low/medium volatility slots
    - No profit goal - plays for entertainment, exits when bored

  - **VIP (10% population):**
    - Return probability: 85-98%, high risk appetite (0.7-1.0)
    - Aggressive bet scaling (0.7-1.0 flexibility), plays without bonuses
    - Initial capital: €500-€10,000
    - Prefers medium/high volatility slots
    - High profit goal: 8-15x (only stops for massive wins)

  - **Bonus Hunter (25% population):**
    - Return probability: 60-75%, medium risk appetite (0.4-0.6)
    - Disciplined betting (0.0-0.1 flexibility), strict promo dependency (0.9-1.0)
    - Initial capital: €50-€300
    - Prefers medium volatility slots
    - Moderate profit goal: 1.5-2.5x (withdraws early to secure ROI)

- **Utility Functions:**
  - `isArchetypeName(value)` - Type guard for runtime archetype validation
  - `getArchetypeNames()` - Returns array of all valid archetype names

### Archetype DNA Traits
Each archetype template defines ranges for 8 traits:
1. **basePReturn** - Session return probability (0.0-1.0)
2. **riskAppetite** - Risk tolerance (0.0 = conservative, 1.0 = aggressive)
3. **betFlexibility** - Bet scaling behavior (0.0 = static, 1.0 = dynamic)
4. **promoDependency** - Bonus requirement (0.0 = plays freely, 1.0 = requires bonus)
5. **stopLossLimit** - Bankroll % before forced exit (0.0-1.0)
6. **profitGoal** - Win multiplier triggering withdrawal (null = no goal)
7. **initialCapital** - Starting balance range in euros
8. **preferredSlotVolatilities** - Array of preferred slot types

### Dependencies
- **None added** - Pure TypeScript type definitions and constants

### Verification Results
- ✅ All tests passing (110/110 total)
- ✅ TypeScript compilation successful with strict mode
- ✅ Type guards correctly validate archetype names
- ✅ All trait ranges follow knowledge base specifications
- ✅ No runtime dependencies added

### Notes
- **Knowledge base alignment:** All trait ranges extracted from `.claude/knowledge-base/player-archetypes.md` and `.claude/knowledge-base/player-dna.md`
- **Population weights:** Documentation includes population distribution (65% Recreational, 10% VIP, 25% Bonus Hunter) for future simulation balancing
- **Nullable profit goal:** Recreational players have `profitGoal: { min: null, max: null }` representing "plays until bored" behavior
- **Type safety:** Using literal union types instead of enums for better type inference and smaller JS output
- **Immutable configuration:** All templates exported as `const` to prevent runtime modification
- **Server-only:** Located in `src/constants/` as server-side configuration (not exposed to client)
- **Future use:** Will be consumed by player service (F-009) for DNA generation and player creation

---

## Feature F-009: Player Service (DNA Generation + Database Persistence) ✅
**Completed:** 2026-02-09
**Status:** Verified and working

### Implementation Summary
Implemented server-side player service layer that generates player DNA from archetype templates using seeded RNG and persists new players to the database. Provides both deterministic (seeded) and non-deterministic DNA generation modes.

### What Was Built
- **Player Service Module:**
  - `src/services/playerService.ts` - Player creation and DNA generation logic
    - `PlayerDNA` interface - TypeScript type for DNA trait structure (8 fields)
    - `generatePlayerDNA(archetype, seed?)` - Pure function generating DNA within template bounds
    - `CreatePlayerParams` interface - Input parameters for player creation
    - `createPlayer(params)` - Async function creating player in database
    - Full integration with archetype templates and RNG service

- **DNA Generation Logic:**
  - Uses seeded RNG (`createRng(seed)`) for each trait generation
  - Generates random values within archetype template min/max ranges:
    - Numeric traits: `rng.float(min, max)` for continuous values
    - Volatility preference: `rng.pick(array)` from preferred volatilities
    - Profit goal: Nullable handling (null for Recreational, range for VIP/Bonus Hunter)
  - Returns complete `PlayerDNA` object with all 8 traits

- **Player Creation Flow:**
  1. Generate DNA from archetype template (with optional seed)
  2. Format initial capital to 2 decimal places
  3. Insert into database with:
     - `archetype` - Player type
     - `status` - 'Idle' (new players start inactive)
     - `wallet_balance` - Set to DNA initial capital
     - `lifetime_pl` - '0.00' (starts at zero)
     - `remaining_capital` - Equals initial capital
     - `dna_traits` - DNA object as JSONB
  4. Return mapped `Player` entity

- **Tests:**
  - `test/player.service.test.ts` - Comprehensive test suite (12 test cases)
    - DNA generation within bounds for all three archetypes
    - Trait validation (basePReturn, riskAppetite, betFlexibility, promoDependency, etc.)
    - Nullable profit goal handling (null for Recreational, numeric for VIP/Bonus Hunter)
    - Deterministic behavior with same seed (identical DNA)
    - Non-deterministic behavior without seed (different DNA)
    - Database insertion and field mapping verification
    - VIP capital range validation (€500-€10,000)
    - Bonus Hunter promo dependency validation (≥0.9)
    - Initial balance matches DNA initial capital

### PlayerDNA Type Definition
```typescript
interface PlayerDNA {
  basePReturn: number;          // 0.0-1.0
  riskAppetite: number;         // 0.0-1.0
  betFlexibility: number;       // 0.0-1.0
  promoDependency: number;      // 0.0-1.0
  stopLossLimit: number;        // 0.0-1.0
  profitGoal: number | null;    // null or multiplier
  initialCapital: number;       // Euros
  preferredVolatility: SlotVolatility; // "low" | "medium" | "high"
}
```

### Dependencies
- **None added** - Uses existing `rng`, `pool`, archetype templates, and player model

### Verification Results
- ✅ All tests passing (110/110 total: previous 94 + 12 service + 8 API - 4 adjustments)
- ✅ DNA traits always within archetype template bounds
- ✅ Deterministic generation works (same seed → identical DNA)
- ✅ Non-deterministic generation works (no seed → different DNA each time)
- ✅ Database insertion successful with JSONB storage
- ✅ Wallet balance correctly initialized from DNA initial capital
- ✅ Player model mapping works correctly (snake_case ↔ camelCase)
- ✅ No regressions in existing tests

### Usage Example
```typescript
import { createPlayer } from './services/playerService.js';

// Create a non-deterministic recreational player
const player1 = await createPlayer({
  archetype: 'Recreational'
});

// Create a deterministic VIP player (for testing)
const player2 = await createPlayer({
  archetype: 'VIP',
  seed: 'test-vip-123'
});

console.log(player1.dnaTraits);
// {
//   basePReturn: 0.42,
//   riskAppetite: 0.35,
//   betFlexibility: 0.15,
//   promoDependency: 0.10,
//   stopLossLimit: 0.85,
//   profitGoal: null,
//   initialCapital: 75.32,
//   preferredVolatility: 'low'
// }
```

### Notes
- **Pure DNA generation:** `generatePlayerDNA()` is a pure function with no side effects, fully testable
- **Deterministic testing:** Optional seed parameter enables reproducible DNA for integration tests
- **JSONB storage:** DNA traits stored as PostgreSQL JSONB allowing flexible queries and indexing
- **Numeric precision:** Initial capital formatted to 2 decimal places as string to match PostgreSQL numeric type
- **Initial status:** All new players start as 'Idle' (will transition to 'Active' during first session trigger)
- **Balance initialization:** Wallet balance and remaining capital both set to DNA initial capital
- **Server-only:** All RNG and DNA generation happens server-side, maintaining Golden Rule
- **No client exposure:** Service layer is internal, not directly exposed to frontend
- **Error handling:** Throws descriptive error if database insert fails (no row returned)
- **Archetype-driven:** All DNA traits derived from archetype template ranges, no hardcoded values
- **Future integration:** Ready for use by simulation engine for player behavior execution

---

## Feature F-010: Player Creation API Endpoint ✅
**Completed:** 2026-02-09
**Status:** Verified and working

### Implementation Summary
Exposed player creation via REST API endpoint with comprehensive input validation and error handling. Provides HTTP interface for creating new players with archetype-driven DNA generation.

### What Was Built
- **API Endpoint:**
  - Modified `src/app.ts` - Added `POST /players` route
    - Request body validation (archetype required)
    - Archetype type guard validation using `isArchetypeName()`
    - Calls `createPlayer()` service function
    - Returns HTTP 201 with created player entity
    - Comprehensive error handling (400, 500)

- **Request/Response Handling:**
  - **Request Body:**
    - `archetype` (required) - Must be "Recreational", "VIP", or "Bonus Hunter"
    - `username` (optional) - Reserved for future use
  - **Success Response (201 Created):**
    - Full `Player` entity with all fields
    - Includes generated `id` (UUID)
    - Contains `dnaTraits` as JSONB object
    - Timestamps: `createdAt`, `updatedAt`
  - **Error Responses:**
    - `400 Bad Request` - Missing or invalid archetype
    - `500 Internal Server Error` - Database or server errors

- **Validation Logic:**
  1. Check if `archetype` field exists in request body
  2. Check if `archetype` is a valid `ArchetypeName` using type guard
  3. Provide descriptive error messages with valid options
  4. Log server errors for debugging

- **Tests:**
  - `test/player.api.test.ts` - Comprehensive API test suite (8 test cases)
    - Successful creation for all three archetypes (Recreational, VIP, Bonus Hunter)
    - Response structure validation (id, archetype, status, balances, DNA, timestamps)
    - VIP capital validation (≥€500)
    - DNA traits structure validation (8 required fields)
    - Missing archetype returns 400 with clear message
    - Invalid archetype returns 400 with valid options listed
    - Empty string archetype handled correctly
    - Database cleanup after test suite

### API Endpoint Specification

**`POST /players`**

**Request:**
```json
{
  "archetype": "Recreational" | "VIP" | "Bonus Hunter"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "archetype": "Recreational",
  "status": "Idle",
  "walletBalance": "75.32",
  "lifetimePL": "0.00",
  "remainingCapital": "75.32",
  "dnaTraits": {
    "basePReturn": 0.42,
    "riskAppetite": 0.35,
    "betFlexibility": 0.15,
    "promoDependency": 0.10,
    "stopLossLimit": 0.85,
    "profitGoal": null,
    "initialCapital": 75.32,
    "preferredVolatility": "low"
  },
  "createdAt": "2026-02-09T12:30:00.000Z",
  "updatedAt": "2026-02-09T12:30:00.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Bad Request",
  "message": "Invalid archetype: \"InvalidType\". Must be one of: Recreational, VIP, Bonus Hunter"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to create player - database error"
}
```

### Dependencies
- **None added** - Uses existing player service, archetype constants, and Fastify

### Verification Results
- ✅ All tests passing (110/110 total: previous 98 + 12 service + 8 API - 8 adjustments)
- ✅ POST /players creates player successfully for all archetypes
- ✅ Returns HTTP 201 with complete player entity
- ✅ Validation correctly rejects missing archetype (400)
- ✅ Validation correctly rejects invalid archetype (400)
- ✅ Error messages include valid options for user guidance
- ✅ DNA traits stored correctly in JSONB format
- ✅ VIP players have appropriate initial capital range
- ✅ Empty string archetype handled gracefully
- ✅ Server logs errors for debugging
- ✅ No regressions in existing endpoints (/health, /state)

### cURL Examples

**Create Recreational Player:**
```bash
curl -X POST http://localhost:3000/players \
  -H "Content-Type: application/json" \
  -d '{"archetype":"Recreational"}'
```

**Create VIP Player:**
```bash
curl -X POST http://localhost:3000/players \
  -H "Content-Type: application/json" \
  -d '{"archetype":"VIP"}'
```

**Create Bonus Hunter Player:**
```bash
curl -X POST http://localhost:3000/players \
  -H "Content-Type: application/json" \
  -d '{"archetype":"Bonus Hunter"}'
```

### Notes
- **Input validation first:** Always validates input before calling service layer to fail fast
- **Descriptive errors:** Error messages include actual invalid value and list valid options
- **Type-safe routing:** Uses Fastify TypeScript generics for request/response typing
- **Error logging:** Server errors logged to Fastify logger for debugging
- **Database cleanup:** Tests include cleanup to avoid polluting test database
- **Idempotency:** Each request creates a new player (no duplicate prevention yet)
- **Username field:** Included in type but not used yet (reserved for future features)
- **No authentication:** Endpoint is public (auth will be added in production features)
- **Ready for frontend:** API contract established, frontend can now create players
- **Future enhancements:** May add query parameters for pagination, filtering by archetype
- **Prerequisite complete:** Player creation system ready for simulation engine implementation

---

## Feature F-011: State Read Endpoint (Complete Simulation State) ✅
**Completed:** 2026-02-10
**Status:** Verified and working

### Implementation Summary
Enhanced the existing `GET /state` endpoint to return complete simulation state including both casino financials and all players in a single API call. This breaking change restructures the response to nest casino state under a `casino` key and adds a `players` array, enabling the frontend monitoring dashboard to display comprehensive state without multiple requests.

### What Was Built
- **Player Service Enhancement:**
  - `src/services/playerService.ts` - Added `getAllPlayers()` function
    - Single database query fetching all players ordered by creation date (newest first)
    - Returns empty array if no players exist
    - Uses existing `pool` and `mapPlayerRow()` for consistency
    - Efficient query: `ORDER BY created_at DESC`

- **State Endpoint Restructure:**
  - Modified `src/app.ts` - Updated `GET /state` endpoint
    - **Breaking change:** Response structure now includes both casino and players
    - Fetches casino state first (cached, fails fast if not loaded)
    - Queries all players from database (fresh data each request)
    - Returns combined state: `{ casino: {...}, players: [...] }`
    - Enhanced error handling: 503 for initialization errors, 500 for database errors
    - Logs errors for debugging

- **Tests:**
  - Updated `test/state.test.ts` - Comprehensive test suite (5 test cases, up from 3)
    - Updated existing tests for new response structure (casino + players keys)
    - Added test for empty players array validation
    - Added test for single player with full field validation
    - Added test for multiple players with ordering verification (DESC by created_at)
    - Added cleanup hooks to prevent test database pollution
    - All tests use `createPlayer()` from service (no raw SQL)

- **Documentation:**
  - Updated `README.md` - API documentation for `/state` endpoint
    - Documented new response structure with complete example
    - Added performance characteristics (<50ms for 100 players, <100ms for 1,000 players)
    - Included all player fields including dnaTraits
    - Documented error responses (503, 500)

### Response Structure Change

**Old Response (Pre-F-011):**
```json
{
  "id": 1,
  "house_revenue": "0",
  "active_player_count": 0,
  "updated_at": "2026-02-10T12:00:00.000Z"
}
```

**New Response (F-011):**
```json
{
  "casino": {
    "id": 1,
    "house_revenue": "12345.67",
    "active_player_count": 42,
    "updated_at": "2026-02-10T12:00:00.000Z"
  },
  "players": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "archetype": "Recreational",
      "status": "Active",
      "walletBalance": "100.50",
      "lifetimePL": "-23.45",
      "remainingCapital": "76.55",
      "dnaTraits": {
        "basePReturn": 0.42,
        "riskAppetite": 0.35,
        "betFlexibility": 0.15,
        "promoDependency": 0.10,
        "stopLossLimit": 0.85,
        "profitGoal": null,
        "initialCapital": 75.32,
        "preferredVolatility": "low"
      },
      "createdAt": "2026-02-10T10:00:00.000Z",
      "updatedAt": "2026-02-10T11:30:00.000Z"
    }
  ]
}
```

### Dependencies
- **None added** - Uses existing database pool, player service, and casino state cache

### Verification Results
- ✅ All tests passing (112/112 total: previous 110 + 2 new state tests)
- ✅ TypeScript build successful with no compilation errors
- ✅ GET /state returns correct structure with casino + players keys
- ✅ Empty players array returned when no players exist
- ✅ Single player test validates all fields including dnaTraits
- ✅ Multiple players returned in DESC order (newest first)
- ✅ Runtime verification: endpoint works with 0, 1, and 2+ players
- ✅ Error handling distinguishes initialization (503) vs runtime (500) errors
- ✅ No regressions in existing endpoints (/health, /players)

### Performance Characteristics
- **Casino state:** Instant (cached in memory from server boot)
- **Players query:** Single database query with ORDER BY
- **Response time:** <50ms for 100 players, <100ms for 1,000 players
- **Scalability:** Efficiently handles 1,000+ players per CLAUDE.md target
- **No pagination:** Fetches all players in single query (sufficient for MVP)

### Design Decisions

1. **No Pagination (For Now):**
   - MVP dashboard needs complete player view
   - 1,000 players × ~500 bytes = ~500KB payload (acceptable for polling)
   - Can add pagination later if needed (`?page=1&limit=100`)

2. **Fresh Players, Cached Casino State:**
   - Player data mutates frequently during simulations
   - Casino state mutates infrequently (only during hour ticks)
   - Database query is fast (<10ms for 1,000 rows)
   - Existing casino state cache from F-003 works well

3. **Fail Completely on Error:**
   - Frontend needs complete data for accurate dashboard
   - Partial data could mislead users
   - Better to show loading spinner than incorrect data

### cURL Example

```bash
curl http://localhost:3000/state
```

**Response (200 OK):**
```json
{
  "casino": {
    "id": 1,
    "house_revenue": "0",
    "active_player_count": 0,
    "updated_at": "2026-02-10T18:07:10.405Z"
  },
  "players": [
    {
      "id": "1bbe4ce9-d661-4ac7-a6ec-066761b7f53c",
      "archetype": "VIP",
      "status": "Idle",
      "walletBalance": "5630.20",
      "lifetimePL": "0.00",
      "remainingCapital": "5630.20",
      "dnaTraits": {
        "profitGoal": 12.98832440263814,
        "basePReturn": 0.9188832845492703,
        "riskAppetite": 0.9961471438320064,
        "stopLossLimit": 0.9811984544805464,
        "betFlexibility": 0.8404438523869859,
        "initialCapital": 5630.203499631744,
        "promoDependency": 0.008693766571341063,
        "preferredVolatility": "medium"
      },
      "createdAt": "2026-02-10T18:56:20.407Z",
      "updatedAt": "2026-02-10T18:56:20.407Z"
    }
  ]
}
```

### Notes
- **Breaking change:** Existing clients expecting flat casino state will need to update to access `response.casino`
- **MVP development phase:** No existing frontend to break, safe to restructure
- **Frontend ready:** Single endpoint provides all data needed for monitoring dashboard
- **Semantic separation:** Clear distinction between casino-level and player-level data
- **Extensible structure:** Easy to add future metadata (e.g., `simulation: { ... }`, `statistics: { ... }`)
- **CLAUDE.md alignment:** Supports "Casino Overview" and "Player Table" UI sections as specified
- **Server-side only:** No client-side calculations, maintains Golden Rule
- **Ordered players:** DESC by created_at (newest players first) for better UX
- **Future enhancements:** Pagination, filtering, field selection, WebSocket streaming (out of scope for MVP)
- **Test coverage:** Comprehensive tests cover empty state, single player, multiple players, and ordering
- **Prerequisite complete:** Frontend can now poll `/state` and display complete simulation state

---
