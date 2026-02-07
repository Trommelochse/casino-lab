# Casino Games Configuration & Math Models

## Global Settings
- **Currency:** USD/EUR
- **RTP Target:** ~96.0% (Theoretical Return to Player)
- **Random Number Generator:** Standard Uniform Distribution mapped to weighted tables below.

---

## 1. Low Volatility Slot ("The Steady Farmer")
*Designed for extended playtime. Wins are frequent but rarely massive. The bankroll declines slowly, with many small "top-up" wins.*

- **Min Bet:** 0.10
- **Max Bet:** 200.00
- **Max Win Exposure:** 500x
- **Hit Frequency:** ~28.5% (approx. 1 in 3.5 spins)

### Win Probability Distribution
| Win Multiplier (xBet) | Probability (Chance) | approx. 1 in X Spins | Description |
| :--- | :--- | :--- | :--- |
| **0.00** (Loss) | 0.715 | - | Dead spin |
| **0.50** | 0.140 | 7.1 | Partial return ("Loss disguise") |
| **1.00** | 0.080 | 12.5 | Money back |
| **2.00** | 0.040 | 25 | Small win |
| **5.00** | 0.015 | 66 | Medium symbol match |
| **10.00** | 0.006 | 166 | High symbol match |
| **20.00** | 0.0025 | 400 | Feature trigger (low tier) |
| **50.00** | 0.001 | 1,000 | Feature trigger (high tier) |
| **100.00** | 0.0004 | 2,500 | Rare full screen |
| **500.00** | 0.00005 | 20,000 | Jackpot / Max Win |

---

## 2. Medium Volatility Slot ("The Golden Temple")
*Balanced gameplay. Standard risk/reward profile suitable for most players. Includes occasional wins that noticeably boost the bankroll.*

- **Min Bet:** 0.20
- **Max Bet:** 100.00
- **Max Win Exposure:** 2,500x
- **Hit Frequency:** ~22.0% (approx. 1 in 4.5 spins)

### Win Probability Distribution
| Win Multiplier (xBet) | Probability (Chance) | approx. 1 in X Spins | Description |
| :--- | :--- | :--- | :--- |
| **0.00** (Loss) | 0.780 | - | Dead spin |
| **0.50** | 0.100 | 10 | Partial return |
| **1.50** | 0.060 | 16 | Small profit |
| **3.00** | 0.035 | 28 | 3-of-a-kind High pay |
| **8.00** | 0.015 | 66 | 4-of-a-kind |
| **15.00** | 0.006 | 166 | 5-of-a-kind |
| **35.00** | 0.0025 | 400 | Bonus Feature (average) |
| **100.00** | 0.001 | 1,000 | Bonus Feature (good) |
| **300.00** | 0.0004 | 2,500 | Bonus Feature (great) |
| **1,000.00** | 0.00008 | 12,500 | Super Win |
| **2,500.00** | 0.00001 | 100,000 | Max Win |

---

## 3. High Volatility Slot ("The Dragon's Hoard")
*Feast or famine. Long periods of dead spins or insignificant wins, punctuated by rare but massive payout spikes. Requires a larger bankroll to sustain.*

- **Min Bet:** 0.20
- **Max Bet:** 50.00 (Often lower to limit casino liability on massive multipliers)
- **Max Win Exposure:** 10,000x
- **Hit Frequency:** ~14.5% (approx. 1 in 7 spins)

### Win Probability Distribution
| Win Multiplier (xBet) | Probability (Chance) | approx. 1 in X Spins | Description |
| :--- | :--- | :--- | :--- |
| **0.00** (Loss) | 0.855 | - | Dead spin |
| **0.20** | 0.080 | 12.5 | Heavy partial loss |
| **1.00** | 0.040 | 25 | Money back |
| **4.00** | 0.015 | 66 | Base game win |
| **15.00** | 0.006 | 166 | Base game high win |
| **50.00** | 0.002 | 500 | Bonus start |
| **200.00** | 0.001 | 1,000 | Bonus with re-trigger |
| **1,000.00** | 0.0005 | 2,000 | Major Jackpot |
| **3,000.00** | 0.0002 | 5,000 | Grand Jackpot |
| **5,000.00** | 0.00008 | 12,500 | Ultra Win |
| **10,000.00** | 0.00001 | 100,000 | Max Win |