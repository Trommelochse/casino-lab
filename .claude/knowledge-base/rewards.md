# Casino Rewards & Loyalty Configuration

## 1. Player Segmentation (Tiers)
Rewards are scaled based on a player's **Theoretical Loss (TL)** and **Lifetime Value (LTV)**.
*Theoretical Loss = Turnover × (1.00 - RTP)*

| Tier | Profile | Daily Turnover | Avg. Deposit | Retention Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Minnow)** | Casual / New | < $500 | $20 - $100 | Low |
| **Tier 2 (Dolphin)** | Regular Player | $500 - $5,000 | $100 - $1,000 | Medium |
| **Tier 3 (Whale)** | VIP / High Roller | > $5,000 | $1,000+ | High |

---

## 2. Free Spin (FS) Rewards Logic

### A. Retention FS (Based on Inactivity)
Triggered when the simulator detects a player hasn't "logged in" for > 72 hours to incentivize a return.

| Player Tier | FS Count | Spin Value | Total Reward Value |
| :--- | :--- | :--- | :--- |
| **Tier 1** | 10 - 20 | $0.10 | $1.00 - $2.00 |
| **Tier 2** | 25 - 50 | $0.20 | $5.00 - $10.00 |
| **Tier 3** | 50 - 100 | $1.00 | $50.00 - $100.00 |

### B. High-Potential "Winner" Bonus
Given to players with high turnover/deposits who are currently in profit, to keep them playing (and eventually returning winnings to the house).

* **Trigger:** Net Profit > 0 AND Daily Turnover > $2,000.
* **Reward:** 20 "Golden Spins" (Wager-Free).
* **Spin Value:** Scaled to 1% of their last withdrawal amount.

---

## 3. Weekly Cashback Program
Cashback is calculated every Monday at 00:00 UTC based on the previous 7 days' **Net Loss**.
*Net Loss = (Total Deposits) - (Total Withdrawals) - (Remaining Balance)*

| Weekly Net Loss | Cashback % | Max Payout Cap |
| :--- | :--- | :--- |
| $10 - $500 | **5%** | $50 |
| $501 - $2,500 | **10%** | $250 |
| $2,501 - $10,000 | **15%** | $1,500 |
| $10,000+ | **20%** | No Limit |
---

## 5. Simulator Math Constraints
* **Max Bet:** While playing with active FS or Bonus, the simulator should cap `Max_Bet` at $5.00 to mimic standard casino anti-abuse rules.