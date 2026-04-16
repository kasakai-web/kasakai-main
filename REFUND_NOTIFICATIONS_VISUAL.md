# Refund Notifications - Visual Walkthrough

## 📱 What Players See

### SCENARIO 1: Event Cancelled by Organiser

#### Step 1: Notification Appears
```
┌─────────────────────────────────────────┐
│  🔔                                  🔴1│  ← Bell icon with badge (1 unread)
└─────────────────────────────────────────┘

Player gets notification on phone/desktop
```

#### Step 2: Player Clicks Bell
```
┌──────────────────────────────────────────┐
│ Notifications                      ✕     │
├──────────────────────────────────────────┤
│                                          │
│ 💚 Refund Credited              1m ago  │  ← BRIGHT GREEN NOTIFICATION
│ ┌────────────────────────────────────┐  │
│ │ ₹500 has been credited to your   │  │
│ │ wallet for "Football Match 7v7"  │  │
│ │ cancellation.                     │  │
│ │                                   │  │
│ │ 👉 Go to Wallet →                │  │ ← Click to open wallet
│ └────────────────────────────────────┘  │
│                                          │
│ ⛔ Game Cancelled               1m ago  │  ← Secondary notification
│ ┌────────────────────────────────────┐  │
│ │ "Football Match 7v7" has been     │  │
│ │ cancelled by the organiser.       │  │
│ │ Reason: Bad weather               │  │
│ └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

#### Step 3: Player Clicks Wallet Link
```
┌──────────────────────────────────────────┐
│ ◄ Wallet                           [🔄]  │
├──────────────────────────────────────────┤
│                                          │
│ 💚 Available Balance                     │
│                                          │
│ ₹2,000                                   │ ← Balance increased by ₹500!
│                                          │
│ ┌─────────────────┬──────────────────┐  │
│ │ Total Added     │      ₹1,500      │  │
│ │ Total Spent     │      ₹1,500      │  │
│ │ Total Refunded  │ ✅    ₹500       │  │
│ └─────────────────┴──────────────────┘  │
│                                          │
│ + Recharge Wallet                        │
│                                          │
├─────── Transaction History ──────────────┤
│                                          │
│ ↩️ Refund                    +₹500      │ ← NEW TRANSACTION
│   "Refund - game cancelled"             │
│   "Football Match 7v7"                  │
│   ══════════════════                    │
│   Balance after: ₹2,000        1m ago   │
│   Status: ✓ Success                     │
│                                          │
│ ⬇️ Game Signup               -₹500      │
│   "Game signup"                         │
│   "Football Match 7v7"                  │
│   ══════════════════                    │
│   Balance after: ₹1,500       1h ago    │
│   Status: ✓ Success                     │
│                                          │
│ ⬆️ Recharge                  +₹1,500    │
│   "Wallet top-up"                       │
│   ══════════════════                    │
│   Balance after: ₹1,500       3h ago    │
│   Status: ✓ Success                     │
│                                          │
└──────────────────────────────────────────┘
```

---

### SCENARIO 2: Player Cancels Their Registration

#### Step 1: Player Cancels
```
┌──────────────────────────────────────────┐
│ ◄ Match Details                          │
├──────────────────────────────────────────┤
│                                          │
│ Football Match 7v7                       │
│ 📍 Turf Name | City                      │
│ 🕐 Wed, 20 Apr 2026 | 5:30 PM - 6:30 PM│
│ ⚽ 7v7                  Fee: ₹500        │
│                                          │
│ ✅ You are registered                    │
│                                          │
│ [🏃 Edit Registration]  [❌ Cancel]     │ ← Click Cancel
│                                          │
└──────────────────────────────────────────┘

↓ Player clicks Cancel button
↓ Confirmation popup appears
```

#### Step 2: Confirmation
```
┌──────────────────────────────────────────┐
│            Cancel Registration?          │
├──────────────────────────────────────────┤
│                                          │
│ Are you sure you want to cancel your    │
│ registration for this event?             │
│                                          │
│              [Go Back]  [Confirm]       │
│                                          │
└──────────────────────────────────────────┘

↓ Player clicks Confirm
↓ Notifications appear
```

#### Step 3: TWO Notifications!

```
┌──────────────────────────────────────────┐
│  🔔                                  🔴2│  ← Bell with 2 unread
└──────────────────────────────────────────┘

Notification 1 (PRIMARY):
┌──────────────────────────────────────────┐
│ 💚 Refund Credited              just now │  ← MONEY CREDITED
│ ┌────────────────────────────────────┐  │
│ │ ₹500 has been credited to your   │  │
│ │ wallet for "Football Match 7v7"  │  │
│ │ cancellation.                     │  │
│ │                                   │  │
│ │ 👉 Go to Wallet →                │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘

Notification 2 (SECONDARY):
┌──────────────────────────────────────────┐
│ ↩️ Backout Confirmed              just now│  ← CONFIRMATION
│ ┌────────────────────────────────────┐  │
│ │ You've successfully backed out    │  │
│ │ of "Football Match 7v7".         │  │
│ │ ₹500 will be in your wallet      │  │
│ │ shortly.                          │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

#### Step 4: Check Wallet
```
Wallet automatically updated:

BEFORE:
Balance: ₹1,500

AFTER:
Balance: ₹2,000 ✅

Transaction appears:
↩️ Refund                    +₹500
"Refund - backout from Football Match 7v7"
Balance after: ₹2,000        just now
Status: ✓ Success
```

---

## 🎯 Key Information Displayed

### Notification Content

#### Refund Credited (💚)
```
Title:     💚 Refund Credited
Amount:    ₹500 (EXACT AMOUNT)
Reason:    for "Game Title" cancellation
Action:    Go to Wallet (direct link)
Time:      just now / 1m ago / 2h ago
Status:    Shows in notification dropdown
```

#### Game Cancelled (⛔) - Additional
```
Title:     ⛔ Game Cancelled
Message:   Game Title cancelled by organiser
Reason:    Optional message from organiser
Status:    Informational
```

#### Backout Confirmed (↩️) - Additional
```
Title:     ↩️ Backout Confirmed
Message:   You've backed out of "Game Title"
Amount:    ₹500 will be in wallet shortly
Status:    Informational
```

---

## 💰 Wallet Transaction Display

### Transaction Details

```
┌─ TRANSACTION ROW ──────────────────────┐
│ ↩️ Refund                    +₹500    │  ← Icon & Amount
│ ┌──────────────────────────────────┐  │
│ │ Refund - game cancelled         │  │
│ │ "Football Match 7v7"            │  │
│ │ ══════════════════════          │  │
│ │ Balance after: ₹2,000           │  │
│ │ Status: ✓ Success     1m ago     │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘

Details:
- Type icon: ↩️ (rewind arrow)
- Color: Light Blue (#60a5fa)
- Sign: + (positive/credit)
- Description: "Refund - [reason]"
- Game link: Clickable game title
- Applied: Timestamp (1m ago)
- Balance proof: Shows balance after
```

---

## 📊 Example: Player's Complete Journey

```
TIME    EVENT                          WALLET              NOTIFICATION
────────────────────────────────────────────────────────────────────────

0:00    Player registers               -₹500               ✅ "Registered"
        Balance: ₹1,000 → ₹500         ⬇️ -500 transaction

0:30    Event cancelled               +₹500              💚 "Refund Credited"
        by organiser                   ↩️ +500 transaction  "₹500 refunded"

        BALANCE: ₹500 → ₹1,000                           ⛔ "Game Cancelled"

0:35    Player checks wallet                            (Opens Wallet page)
                                      Shows ↩️ +₹500
                                      Total Refunded: ₹500

1:00    Player signs up for            -₹500              ✅ "Registered"
        different game                 Balance: ₹1,000 → ₹500  "New game"

        READY TO PLAY OR CANCEL AGAIN ANYTIME
```

---

## ✨ Key Features Summary

| Feature | Before | After |
|---------|--------|-------|
| **Refund Amount** | ❌ Hidden | ✅ Shown in notification |
| **Amount Format** | ❌ "You'll be refunded" | ✅ "₹500 has been credited" |
| **Wallet Link** | ❌ Must navigate manually | ✅ Click notification |
| **Notification Type** | ❌ Generic | ✅ 💚 Refund_Credited |
| **Color Coding** | ⚠️ Same as others | ✅ Bright green (positive) |
| **Confirmation** | ⛔ Only cancellation | ✅ Separate refund notification |
| **Transaction History** | ✅ Shows amount | ✅ Shows reason + game |
| **User Clarity** | ❌ "Was my money refunded?" | ✅ "Yes, ₹500 confirmed" |

---

## 🎬 User Acceptance Test

### Test Case 1: Game Cancellation
```
✅ Event cancelled by organiser
✅ Player receives 💚 notification within 2 seconds
✅ Notification says: "₹500 has been credited..."
✅ Click notification → Goes to wallet
✅ Wallet shows ↩️ +₹500 transaction
✅ Balance increased by ₹500
✅ Player receives email notification
✅ Optional message from organiser included
```

### Test Case 2: Player Backout
```
✅ Player clicks Cancel Registration
✅ Confirmation popup appears
✅ Player confirms
✅ 💚 Refund notification appears: "₹500 credited..."
✅ ↩️ Backout notification appears: "Backed out successfully"
✅ Both notifications clickable
✅ Wallet shows ↩️ +₹500 within 1 second
✅ Waitlisted players get 🔔 spot alert
✅ Organiser gets 📢 backout alert
```

### Test Case 3: Wallet Verification
```
✅ Wallet page shows updated balance
✅ Transaction history has ↩️ refund entry
✅ Amount shows: +₹500
✅ Description: "Refund - game cancelled" OR "Refund - backout from..."
✅ Game title clickable
✅ Balance after transaction shown
✅ Status shows: ✓ Success
✅ Timestamp accurate (just now / Xm ago)
```

---

## 📲 Mobile vs Desktop

### Mobile View (≤ 767px)
```
Notification Bell takes full width
Dropdown scrolls vertically
Notification texts truncate gracefully
Touch targets are 44px+ for easy tapping
```

### Desktop View (> 1024px)
```
Notification Bell in fixed position
Dropdown appears on hover or click
Full text visible
Smooth hover effects
```

---

## 🚀 Production Ready

✅ **Backend:**
- Refund amounts calculated correctly
- Notifications sent immediately
- Wallet updated atomically
- Error handling in place

✅ **Frontend:**
- User portal updated
- Organiser portal updated
- Admin portal ready
- Mobile responsive

✅ **Testing:**
- All tests pass
- All builds successful
- No TypeScript errors
- No compilation warnings

✅ **Documentation:**
- User-facing walkthrough (this document)
- Technical implementation guide
- Test scenarios defined
- Deployment checked

---

**Status:** ✅ READY FOR PRODUCTION
**Last Updated:** 2026-04-16
**Version:** 1.0 - Refund Notifications Complete
