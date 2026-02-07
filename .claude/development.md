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
