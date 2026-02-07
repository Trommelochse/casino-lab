# Player Action Definitions

This document defines the discrete actions a player can perform within the simulation. These actions serve as the building blocks for the player's behavior loop.

---

## 1. Action: Start Session
*The transition from an "Idle" state to an "Active" state.*
- **Effect:** Initializes session-specific variables such as `session_spin_count`, `session_start_balance`, and selects the game type (volatility) to be played.

## 2. Action: Deposit
*The transfer of funds from an external source to the player's internal wallet.*
- **Effect:** Increases the `Wallet_Balance`. If the deposit is linked to a promotion, it may also initialize a `Bonus_Balance` or `Wagering_Requirement`.

## 3. Action: Claim Free Spin Bonus
*The activation of non-cash betting rounds.*
- **Effect:** Queues a set number of spins that do not deduct from the `Wallet_Balance`. Wins from these spins are typically credited to the `Wallet_Balance` or a `Bonus_Balance`.

## 4. Action: Claim Cashback
*The retrieval of funds based on a percentage of previous net losses.*
- **Effect:** Increases the `Wallet_Balance` by the calculated cashback amount and resets the "Loss Tracker" for the current period.

## 5. Action: Bet
*The execution of a single game round.*
- **Effect:** - Deducts `Bet_Size` from `Wallet_Balance`.
    - Queries the RNG engine for a result.
    - Adds the product of (`Bet_Size` * `Multiplier`) back to the `Wallet_Balance`.
    - Increments the `Total_Turnover` and `session_spin_count`.

## 6. Action: Withdraw
*The removal of funds from the internal wallet to an external source.*
- **Effect:** Decreases `Wallet_Balance` to $0 and increases the `Total_Withdrawals` counter for the player's lifetime statistics.

## 7. Action: End Session
*The transition from an "Active" state to an "Idle" state.*
- **Effect:** Finalizes session logs, calculates the session's net profit/loss, and triggers the logic to determine when (or if) the player will return for a future session.

---

## Action Summary Table

| Action | Primary Impact | Resource Affected |
| :--- | :--- | :--- |
| **Start Session** | State Change | Session Variables |
| **Deposit** | Inflow | Wallet Balance |
| **Claim Free Spins** | Inventory Use | Bonus Queue |
| **Claim Cashback** | Inflow | Wallet Balance |
| **Bet** | Turnover | Wallet / Bonus Balance |
| **Withdraw** | Outflow | Wallet Balance |
| **End Session** | State Change | Player Persistence Data |