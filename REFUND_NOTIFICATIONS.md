# Refund Notification System - Implementation Guide

## Overview

Players now receive **prominent notifications showing the exact refund amount** when:
1. Event is cancelled by organiser
2. Player cancels their own registration

---

## 📱 Refund Notification Flow

### Scenario 1: Organiser Cancels Event

**User Action:**
```
Organiser → Dashboard → Select Game → Click Cancel (✕) → Fill Message → Confirm
```

**System Process:**
```
Backend calculates:
  ├─ Player 1: Refund ₹500
  ├─ Player 2: Refund ₹500  
  └─ Player 3: Refund ₹500

For each player:
  ├─ 💚 REFUND NOTIFICATION
  │  ├─ Title: "💚 Refund Credited"
  │  ├─ Body: "₹500 has been credited to your wallet for 'Game Title' cancellation."
  │  ├─ Action: Link to Wallet page
  │  └─ Type: refund_credited
  │
  ├─ Email: Game Cancelled notification
  │  └─ Includes optional organiser message
  │
  └─ Wallet Updated
     ├─ Balance: +₹500
     └─ Transaction: Type "refund"
```

**Player Experience:**
1. Opens app → sees 💚 notification badge
2. Clicks notification → sees "₹500 has been credited..."
3. Clicks → goes to Wallet page
4. Sees transaction in history: "↩ Refund +₹500"
5. Balance increased by ₹500

---

### Scenario 2: Player Cancels Registration

**User Action:**
```
Player → My Games → Click Game → Click Cancel Registration → Confirm
```

**System Process:**
```
Backend calculates:
  └─ Player Refund: ₹500

For the player:
  ├─ 💚 REFUND NOTIFICATION (Primary)
  │  ├─ Title: "💚 Refund Credited"
  │  ├─ Body: "₹500 has been credited to your wallet for 'Game Title' cancellation."
  │  ├─ Action: Link to Wallet page
  │  └─ Type: refund_credited
  │
  ├─ ↩ BACKOUT CONFIRMATION (Secondary)
  │  ├─ Title: "↩ Backout Confirmed"
  │  ├─ Body: "You've successfully backed out of 'Game Title'. ₹500 will be in your wallet shortly."
  │  └─ Type: game_backout_player
  │
  ├─ Email: Registration Cancelled
  │  └─ Confirms backout
  │
  └─ Wallet Updated
     ├─ Balance: +₹500
     └─ Transaction: Type "refund"

For organiser:
  └─ 📢 BACKOUT NOTIFICATION
     ├─ Body: "[Player Name] has backed out. A spot is now available."
     └─ Type: game_backout_organiser

For waitlisted players:
  └─ 🔔 SPOT AVAILABLE NOTIFICATION
     ├─ Body: "A spot just opened in 'Game Title'. Register now!"
     └─ Type: waitlist_spot
```

**Player Experience:**
1. Opens app → sees TWO notifications (💚 + ↩)
2. Clicks 💚 refund → "₹500 has been credited..."
3. Clicks action → goes to Wallet page
4. Sees ↩ transaction showing +₹500
5. Money available immediately for next game

---

## 🔔 Notification Details

### Refund Credited Notification

**Display in Notification Bell:**
```
┌─────────────────────────────┐
│ 💚 Refund Credited          │  ← Icon + Title
│ ┌───────────────────────────┤
│ │ ₹500 has been credited    │
│ │ to your wallet for        │
│ │ "Football Game 7v7"       │
│ │ cancellation.             │
│ │                           │
│ │ 📍 Go to Wallet →         │  ← Action Link
│ └───────────────────────────┤
│ 2m ago                      │  ← Time
└─────────────────────────────┘
```

**Notification Properties:**
- Type: `refund_credited`
- Icon: 💚 (green heart)
- Title: "💚 Refund Credited"
- Body: `₹{amount} has been credited to your wallet for "{gameTitle}" cancellation.`
- Action URL: `/dashboard/player/{playerId}/wallet`
- Color: Green/Blue (shows positive action)

---

## 💰 Wallet Transaction Display

### Example Wallet History After Refund

```
┌─────────────────────────────────────────────────────┐
│ TRANSACTION HISTORY                                 │
├─────────────────────────────────────────────────────┤
│ ↩ Refund                            +₹500   💚 Blue│
│ Refund – game cancelled             just now      │
│ "Football Game 7v7"                               │
│ Balance after: ₹1,500                             │
│                                                   │
│ ⬇ Game Signup                       -₹500   🔴 Red│
│ Game signup                         5m ago        │
│ "Football Game 7v7"                               │
│ Balance after: ₹1,000                             │
│                                                   │
│ ⬆ Recharge                        +₹1,500  🟢 Green│
│ Wallet top-up                      10m ago        │
│ Balance after: ₹1,500                             │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features

### 1. Immediate Refund Credit
- Notification sent as soon as game is cancelled
- Refund amount visible in notification body
- No need to navigate elsewhere to see amount

### 2. Easy Wallet Access
- Notification includes direct link to wallet
- One click to see full transaction details
- History shows all refunds with amount and reason

### 3. Clear Amount Display
- Always shows: `₹{amount}` in notification
- Example: "₹500 has been credited..."
- Amount matches exactly what was charged

### 4. Transaction Categorization
- All refunds show with "↩" icon (blue color)
- Transaction description includes game title
- Balance shown after each transaction

### 5. Multiple Notification Types
For player backout:
- 💚 **Refund Credited** (primary, shows amount)
- ↩ **Backout Confirmed** (secondary, confirms action)
- Can dismiss one, keep the other

---

## 🛠️ Backend Implementation

### Game Cancellation Refund Process

```javascript
// 1. Calculate refund amounts
const refundByPlayer = {};
for (const reg of registrations) {
  refundByPlayer[playerId] += reg.amountPaidPaise;
}

// 2. For each player, send notification WITH amount
for (const [pid, amount] of Object.entries(refundByPlayer)) {
  const refundRupees = (amount / 100).toFixed(0);
  
  // SEND NOTIFICATION WITH AMOUNT
  notify(pid, 'player', {
    type:      'refund_credited',
    title:     '💚 Refund Credited',
    body:      `₹${refundRupees} has been credited to your wallet for "${gameTitle}" cancellation.`,
    actionUrl: `/dashboard/player/${pid}/wallet`,
  });
  
  // THEN process wallet refund
  walletService.refund(pid, amount, `Refund – game cancelled (${gameTitle})`, gameId);
}
```

### Player Backout Refund Process

```javascript
// 1. Calculate refund amount
const refundAmountPaise = playerRegistrations.reduce(
  (sum, reg) => sum + (reg.amountPaidPaise || 0),
  0
);

// 2. Send REFUND CREDITED notification
if (refundAmountPaise > 0) {
  notify(req.user._id, 'player', {
    type:      'refund_credited',
    title:     '💚 Refund Credited',
    body:      `₹${(refundAmountPaise / 100).toFixed(0)} has been credited to your wallet for "${game.title}" cancellation.`,
    actionUrl: `/dashboard/player/${req.user._id}/wallet`,
  });
}

// 3. Send BACKOUT CONFIRMATION notification
notify(req.user._id, 'player', {
  type:      'game_backout_player',
  title:     '↩ Backout Confirmed',
  body:      `You've successfully backed out of "${game.title}". ₹${(refundAmountPaise / 100).toFixed(0)} will be in your wallet shortly.`,
});

// 4. Process wallet refund
walletService.refund(req.user._id, refundAmountPaise, `Refund – backout from ${game.title}`);
```

---

## ✨ Frontend Components

### NotificationBell Icon Mapping

```typescript
const TYPE_ICON: Record<string, string> = {
  refund_credited:       "💚",    // NEW: Green heart for refunds
  game_cancelled:        "⛔",    // Red stop for cancellations
  game_backout_player:   "↩",    // Arrow for backout
  waitlist_spot:         "🔔",   // Bell for waitlist
  wallet_topup:          "💰",   // Money for topup
  // ... other types
};
```

### Notification Display

```
User opens app
    ↓
Notification Bell shows unread count (badge)
    ↓
Click bell → Dropdown opens
    ↓
Sees: "💚 Refund Credited - ₹500 has been credited..."
    ↓
Click notification → Goes to Wallet page
    ↓
Wallet shows transaction: "↩ Refund +₹500"
```

---

## 📊 Test Scenarios

### Test 1: Game Cancellation (3 Players)
```
Setup:
- Game: ₹500 fee
- 3 players registered

Action:
- Organiser cancels game with message "Bad weather"

Expected:
- Each player gets 💚 notification: "₹500 has been credited..."
- Each gets email with cancellation message
- Each wallet shows +₹500 transaction
- ✓ Each sees their balance increase by ₹500
```

### Test 2: Player Backout
```
Setup:
- Player registered for ₹500 game
- Wallet balance: ₹1,500

Action:
- Player clicks "Cancel Registration"

Expected:
- 💚 Refund notification: "₹500 has been credited..."
- ↩ Backout confirmation notification
- Email confirmation sent
- Wallet balance: ₹2,000 (+₹500)
- Transaction shows: "↩ Refund +₹500"
- ✓ Waitlisted players get spot alert
```

### Test 3: Wallet History
```
Setup:
- Multiple refunds over time

Action:
- Player opens wallet page

Expected:
- All refunds sorted by date (newest first)
- Each shows: "↩ Refund +₹X" 
- Description shows game title
- Color is blue
- ✓ "Total Refunded" metric reflects all refunds
```

---

## 🚀 Deployment Status

**Backend:** ✅ Refund notifications with amounts
- Game cancellation sends refund amount
- Player backout sends refund amount
- Notifications link to wallet page

**Frontend:** ✅ Display enhancements
- user-frontend: NotificationBell updated
- organiser-portal: NotificationBell updated
- Notification icon: 💚 refund_credited

**Testing:** ✅ All builds pass
- Backend: `npm test` → 4 pass, 0 fail
- User Frontend: `npm run build` → ✓ Compiled
- Organiser Portal: `npm run build` → ✓ Compiled
- Admin Portal: `npm run build` → ✓ Compiled

**Git Status:** ✅ Committed and pushed
- Commit: a5faa1c "Add refund amount notifications..."
- Remote: main branch updated

---

## 📝 Summary

**What was added:**
1. Refund amount displayed in notification: "₹500 has been credited..."
2. New notification type: `refund_credited` (green heart 💚)
3. Direct wallet page link from notification
4. Separate notifications for refund and confirmation

**User flow:**
1. Event cancelled/Player backs out
2. Notification appears: "💚 ₹500 has been credited to your wallet"
3. Click → Wallet page shows transaction
4. Balance increased automatically

**No changes needed to:**
- Wallet transaction model (already tracks amounts)
- Refund processing (already working)
- Email system (already sends emails)

**Result:**
✅ Players see exactly how much they were refunded
✅ Easy navigation to wallet for verification
✅ Clear, visible in-app notifications
✅ Professional, user-friendly experience

---

**Last Updated:** 2026-04-16
**Status:** 🟢 Ready for Production
