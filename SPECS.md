# Project Specification: Online Casino Simulator (MVP)

## 1. Overview
The Online Casino Simulator is a client-server application designed to model digital casino operations. The system simulates player behavior, financial volatility, and population growth over time. 

The architecture follows a **Headless Server / Remote GUI** pattern, where the simulation logic resides on the backend, and the frontend acts as a monitoring and command console.

---

## 2. System Architecture

### 2.1 Backend (Simulation Engine)
* **Role:** Processes all mathematical calculations, maintains the "Source of Truth" for player data, and manages the simulation clock.
* **State Management:** Stores the global casino bankroll and a collection of Player objects.
* **API/Socket Layer:** Exposes endpoints for the GUI to trigger actions and fetch current state updates.

### 2.2 Frontend (Control Dashboard)
* **Role:** Provides a visual representation of the server state and sends control signals to the backend.
* **Communication:** Polls the server for state changes to update the Player Table.

---

## 3. MVP Features & UI Requirements

### 3.1 Simulation Controls
The GUI shall provide the following interactive elements:
* **"Create New Player" Button:** Sends a request to the server to instantiate a new player. The server determines the player's attributes (Risk Profile, Capital) based on distributions in `.claude/knowledge-base`.
* **Simulate 1 hour** Sends a trigger to the server to process a one hour cycle. 

### 3.2 Data Visualization
* **Player State Table:** A dynamic table that reflects the server-side state of all players.
    * **Fields:** Player ID, Archetype, Current Casino Balance, Remaining Capital, Lifetime P/L, and Status (Active/Broke/Churned).
* **Casino Overview:** A high-level summary showing Total House Revenue and Total Active Player Count.

---

## 4. Logic & Calculations
All simulation logic must adhere to the specific constraints defined in the `.claude/knowledge-base` directory.

### 4.1 Player Generation Logic
* **Reference:** See `.claude/knowledge-base/player-archetypes.md` and `.claude/knowledge-base/player-dna.md`.

---

## 5. Technical Stack
* **Server:** Node.js/Express
* **Client:** React/Vite
* **Protocol:** REST API

---

## 6. Development Guidelines
* **Decoupling:** The GUI should never calculate money. It only displays what the server reports.
* **Deterministic vs. Stochastic:** Ensure the random seed logic (if any) is handled server-side to maintain simulation consistency.
* **Scalability:** The server should be able to handle the simulation of 1,000+ players per "Day" tick without UI freezing.

## 7. Server-Side Execution Logic (The "Hour Tick")

When the `Simulate 1 hour` trigger is received, the Backend must execute the following sequence precisely:

### 7.1 The Simulation Pipeline (Updated: Micro-Bet Resolution)
The server shall process the "Hour Tick" as a batch operation following this flow:

1. **Active Pool Selection**: Filter the global Player collection for status `Active`.
2. **Deterministic Iteration**: For each active player:
    * **Frequency Calculation**: Determine the total number of spins for the hour based on the Player's Archetype (e.g., 600 spins/hour).
    * **Game Model Selection**: Identify which Slot Model from `slot-models.md` the player is currently "playing" (Low, Medium, or High Volatility).
    * **Micro-Bet Loop**: Execute a discrete loop for the total number of spins:
        * **RNG Draw**: Generate a random float between 0.0 and 1.0.
        * **Table Lookup**: Compare the float against the "Win Probability Distribution" table for the selected Slot Model.
        * **Multiplier Application**: Identify the corresponding `Win Multiplier` (e.g., 0.00x, 15.00x, 1000.00x) based on the probability brackets.
        * **Immediate Mutation**:
            * Subtract `BetSize` from `Player.Balance`.
            * Add `BetSize * Multiplier` back to `Player.Balance`.
            * Update `Casino.TotalRevenue` by the net result of that specific spin.
        * **Early Exit**: If `Player.Balance` falls below the game's `Min Bet`, break the loop immediately and set status to `Broke`.
    * **State Mutation**: 
        * Finalize `Player.LifetimePL` for the hour.