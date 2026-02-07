# Player DNA & Archetype Configuration

This document defines the base "Genetic Traits" assigned to a player upon creation, mapped to the primary behavior profiles.

---

## 1. Global Genetic Traits (The "Genes")

| Trait | Description | Impact on Code |
| :--- | :--- | :--- |
| `base_p_return` | Natural loyalty / Persistence | Probability (0.0 - 1.0) the player returns for another session. |
| `risk_appetite` | Volatility preference | Dictates slot choice (Low, Medium, or High Volatility). |
| `bet_flexibility` | Betting style | 0.0 = Static bets; 1.0 = Aggressive scaling after wins/losses. |
| `promo_dependency`| Bonus requirement | If 1.0, the player only triggers a session if `rewards.md` logic is met. |
| `stop_loss_limit` | Exit strategy | % of bankroll lost before forced session termination. |
| `profit_goal` | Exit strategy | Multiplier of deposit where the player "cashes out" and stops. |

---

## 2. Archetype Templates

### 1. The Recreational Player (Entertainment Focus)
* **Population Weight:** 65%
* **Base P-Return:** 0.30 - 0.50
* **Risk Appetite:** Low to Medium
* **Betting Style:** Static (€0.10 - €1.00)
* **DNA Profile:**
    * `promo_dependency`: 0.2 (Will play with raw cash)
    * `bet_flexibility`: 0.1 (Rarely changes bet)
    * `profit_goal`: null (Plays until "bored" or out of time)
    * `stop_loss_limit`: 0.8 (May leave with some balance left)

### 2. The VIP (Aggressive Whale)
* **Population Weight:** 10%
* **Base P-Return:** 0.85 - 0.98
* **Risk Appetite:** High to Very High
* **Betting Style:** Dynamic/Escalating (€0.50 - €5.00+)
* **DNA Profile:**
    * `promo_dependency`: 0.1 (Deposits frequently regardless of offers)
    * `bet_flexibility`: 0.9 (Aggressively increases bets on wins)
    * `profit_goal`: 10.0+ (Only stops for massive wins)
    * `stop_loss_limit`: 1.0 (Always plays to €0)

### 3. The Bonus Hunter (Calculated/Disciplined)
* **Population Weight:** 25%
* **Base P-Return:** 0.60 - 0.75 (High, but only when incentivized)
* **Risk Appetite:** Medium (Focuses on clearing wagering)
* **Betting Style:** Disciplined/Calculated
* **DNA Profile:**
    * `promo_dependency`: 1.0 (Probability of session is 0 if no bonus is present)
    * `bet_flexibility`: 0.0 (Strict adherence to optimal bet sizes)
    * `profit_goal`: 1.5 - 2.0 (Withdraws early to secure ROI)
    * `stop_loss_limit`: 1.0 (Will use the full bonus/deposit to hit goal)

---

## 3. DNA-Driven Session Logic

### Session Trigger
```javascript
if (player.archetype === "Bonus Hunter") {
    return (hasActiveBonus(player) || hasFreeSpins(player));
} else {
    return (Math.random() < player.base_p_return);
}