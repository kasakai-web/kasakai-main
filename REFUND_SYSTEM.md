# Kasa Kai Refund System

## Overview

The Kasa Kai platform implements a complete refund system for game cancellations and player registration cancellations. All refunds are automatically processed and reflected in player wallets.

---

## 🔄 Refund Scenarios

### 1. Organiser Cancels Game

**Trigger:** When organiser clicks the Cancel (✕) button on a game

**Process:**
- Organiser opens game dashboard
- Clicks Cancel button (red ✕ icon) on any upcoming game
- Fills out optional cancellation message
- Confirms cancellation
- System immediately processes refund

**Backend Execution:**
```
DELETE /api/v1/games/organisers/:id
↓
For each registered player:
  - Calculate: refund amount = player's amountPaidPaise
  - Call: walletService.refund(playerId, amount, description, gameId)
  - Send: Email notification to player
  - Send: In-app notification to player
  - Mark: Registration paymentStatus = 'refunded'
```

**Wallet Impact:**
- Player's `balancePaise` increases by refund amount
- `totalRefundedPaise` metric increases
- New transaction created with type `'refund'`
- Transaction shows in "Transaction History" on wallet page

**Notifications:**
- Email: "Game Cancelled - [Game Title]"
- In-app: "⛔ Game Cancelled"
- Body includes optional organiser message

---

### 2. Player Cancels Registration

**Trigger:** When player clicks "Cancel Registration" from My Games

**Process:**
- Player goes to User Portal Dashboard
- Clicks on their registered game
- Opens game details
- Clicks "Cancel Registration" button
- Confirms cancellation
- System immediately processes refund

**Backend Execution:**
```
POST /api/v1/games/:id/backout
↓
- Calculate: refund amount = sum of all player's registrations' amountPaidPaise
- Remove: All player registrations from game
- Call: walletService.refund(playerId, amount, description, gameId)
- Send: Email notification to player
- Send: Email notification to organiser
- Send: In-app notifications (both sides)
- Notify: All waitlisted players of newly available spot
```

**Wallet Impact:**
- Player's `balancePaise` increases by refund amount
- `totalRefundedPaise` metric increases
- New transaction created with type `'refund'`
- Player can immediately re-register or use balance elsewhere

**Notifications:**
- Player Email: "Registration Cancelled - [Game Title]"
- Organiser Email: "Player Backed Out - [Player Name]"
- In-app: "Registration cancelled successfully"

---

## 💰 Wallet Display

### User Portal (`/dashboard/player/[id]/wallet`)

**Available Balance:**
- Large green display showing: `balance - locked` (or just balance if no lock)
- Formula: `wallet.availablePaise = wallet.balancePaise - wallet.lockedPaise`
- Virtual field computed in real-time

**Balance Metrics:**
- **Total Added:** Sum of all topup transactions
- **Total Spent:** Sum of all debit transactions (game signups)
- **Total Refunded:** Sum of all refund transactions ← Shows player their cumulative refunds

**Transaction History:**
Each transaction shows:
- Icon + Label: ↩ Refund
- Amount: + amount (green)
- Description: "Refund – [reason]" e.g., "Refund – game cancelled" or "Refund – backout from [game]"
- Game link: If refunded due to game action
- Timestamp: Created date/time
- Balance after: Balance post-transaction

**Auto-Refresh:**
- Updates every 30 seconds silently
- Also refreshes on app focus
- Also refreshes on app visibility change
- No loading spinner (silent background refresh)

**Transaction Type Categorization:**
```typescript
const TX_CONFIG = {
  refund:      { label: "Refund",      sign: "+", color: "#60a5fa", icon: "↩" },  // BLUE
  topup:       { label: "Recharge",    sign: "+", color: "#4ade80", icon: "⬆" },  // GREEN
  debit:       { label: "Game signup", sign: "−", color: "#f87171", icon: "⬇" },  // RED
  backout_fee: { label: "Backout fee", sign: "−", color: "#f87171", icon: "⚠" },  // RED
  withdrawal:  { label: "Withdrawal",  sign: "−", color: "#f59e0b", icon: "💸" }, // ORANGE
  lock:        { label: "Locked",      sign: "−", color: "#a78bfa", icon: "🔒" }, // PURPLE
  unlock:      { label: "Unlocked",    sign: "+", color: "#a78bfa", icon: "🔓" }, // PURPLE
  bonus:       { label: "Bonus",       sign: "+", color: "#4ade80", icon: "🎁" },  // GREEN
}
```

---

## 📊 Backend Wallet Schema

### Wallet Model
```javascript
{
  user: ObjectId(Player),         // Reference to player
  balancePaise: Number,           // Available balance (in paise, ÷100 = rupees)
  lockedPaise: Number,            // Locked for pending games
  currency: String,               // "INR"
  totalTopUpPaise: Number,        // Cumulative topups
  totalSpentPaise: Number,        // Cumulative debits (game signups)
  totalRefundedPaise: Number,     // Cumulative refunds (SHOWS TOTAL REFUND AMOUNT)
  isActive: Boolean,
  timestamps: true
}
```

### WalletTransaction Model
```javascript
{
  wallet: ObjectId(Wallet),
  user: ObjectId(Player),
  type: String,                   // 'topup', 'debit', 'refund', 'lock', 'unlock', etc.
  amountPaise: Number,
  balanceAfterPaise: Number,
  game: ObjectId(Game),           // Reference to related game
  description: String,            // e.g., "Refund – game cancelled (Game Title)"
  status: String,                 // 'success', 'pending', 'failed'
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔗 API Endpoints

### Game Cancellation
**DELETE** `/api/v1/games/organisers/:id`

```javascript
Body: {
  cancelMessage: String (optional)  // Message to send to players
}

Response: {
  success: true,
  message: "Game cancelled successfully",
  data: { /* cancelled game object */ }
}
```

### Player Backout
**POST** `/api/v1/games/:id/backout`

```javascript
Response: {
  success: true,
  message: "Backed out successfully",
  data: { /* updated game object */ }
}
```

### Get Wallet & Transactions
**GET** `/api/v1/players/me/wallet`

Requires: `Authorization: Bearer {token}`

```javascript
Response: {
  success: true,
  data: {
    wallet: {
      _id: String,
      balancePaise: Number,
      availablePaise: Number,    // Virtual: balance - locked
      totalTopUpPaise: Number,
      totalSpentPaise: Number,
      totalRefundedPaise: Number  // Shows total refunded
    },
    transactions: [
      {
        _id: String,
        type: 'refund|debit|topup|...',
        amountPaise: Number,
        balanceAfterPaise: Number,
        description: String,
        game: { _id: String, title: String },
        createdAt: ISO8601,
        status: 'success|pending|failed'
      }
    ]
  }
}
```

---

## 🧪 Test Scenarios

### Test 1: Organiser Cancels Game
1. Organiser creates game with ₹500 fee
2. 3 players register (₹500 each = ₹1500 total)
3. Organiser cancels game
4. **Verify:**
   - Each player's wallet shows +₹500 ✓
   - Transaction shows as "Refund – game cancelled [Game Title]"
   - All 3 players get email notifications
   - All 3 players get in-app notifications
   - Game status shows "cancelled"

### Test 2: Player Backs Out Before Cutoff
1. Player registers for game (₹500 fee, balance becomes -₹500)
2. Player views "My Games" and clicks "Cancel Registration"
3. Confirms cancellation
4. **Verify:**
   - Wallet balance increases by ₹500
   - Transaction shows as "Refund – backout from [Game Title]"
   - Player gets email: "Registration Cancelled"
   - Organiser gets email: "[Player Name] backed out"
   - Waitlisted players get notification of new spot

### Test 3: Wallet History Display
1. Player does multiple transactions (signup, refund, topup)
2. Opens wallet page
3. **Verify:**
   - "Total Refunded" shows sum of all refunds
   - Transaction history shows all refunds with ↩ icon (blue)
   - List is sorted newest first
   - Auto-refreshes every 30 seconds

### Test 4: Game Cancellation After Completion
1. Confirm: Cannot cancel completed games
2. System should return 400 error: "Cannot update a completed game"
3. No refund processed
4. **Verify:** Error message shown to organiser

---

## ⚙️ Configuration

### Auto-Refresh Intervals
- **User Wallet:** 30 seconds (`/dashboard/player/[id]/wallet`)
- **Organiser Profile:** 30 seconds (`/dashboard/organizer/[id]/profile`)
- **Organiser Games List:** 20 seconds (`/dashboard/organizer/[id]`)
- **User Games Dashboard:** 20 seconds (`/dashboard/player/[id]`)

### Refund Description Format
- Game Cancellation: `"Refund – game cancelled ({gameTitle})"`
- Player Backout: `"Refund – backout from {gameTitle or date}"`

### Email Templates
- **Game Cancelled (Player):** `sendGameCancelledPlayerEmail`
- **Game Cancelled (Organiser):** `sendGameCancelledOrganizerEmail`
- **Backout (Player):** `sendGameBackoutPlayerEmail`
- **Backout (Organiser):** `sendGameBackoutOrganizerEmail`

---

## 🚀 Deployment Checklist

- [x] Game cancellation refund logic implemented
- [x] Player backout refund logic implemented
- [x] Wallet balance updates correctly
- [x] Transaction history shows refunds
- [x] Email notifications sent
- [x] In-app notifications sent
- [x] Wallet page displays all transaction types
- [x] Auto-refresh on wallet page (30s)
- [x] Frontend handles "do you want to cancel" confirmation
- [x] Test all three portals (user, organiser, admin)
- [x] Database migrations complete
- [x] Error handling for edge cases
- [x] Production URLs configured (PLAYER_FRONTEND_URL, etc.)

---

## 📝 Notes

1. **No Manual Intervention Needed:** All refunds are automatic and immediate
2. **Wallet Lock/Unlock:** Used for pending game payments (pre-implementation)
3. **Transaction History:** Limited to 50 most recent on API, but all stored in DB
4. **Cancellation Message:** Optional - helps player understand why game was cancelled
5. **Refund is NOT Withdrawal:** Refund puts money back in wallet. Withdrawal is separate withdrawal to bank account

---

Last Updated: 2026-04-16
System Status: ✅ FULLY OPERATIONAL
