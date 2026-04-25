'use strict';

/**
 * TeamDistributor
 *
 * Accepts an array of player objects and splits them into two balanced teams.
 *
 * Expected player shape:
 * {
 *   id:          any          — unique identifier (ObjectId string / number)
 *   name:        string       — display name, used for preference lookups
 *   rating:      number       — skill score (1–5 scale); default 2.5 for unrated
 *   position:    'G'|'D'|'M'|'F'|'Any'
 *   gkQuotient:  number       — 0 = no GK; ≥ 2 = GK candidate (3 = dedicated GK)
 *   playWith:    string[]     — names of players this person wants on the same team
 *   playAgainst: string[]     — names of players this person wants on the opposing team
 *   groupId:     string|null  — players sharing a groupId must stay together
 *   signedUpAt:  Date|string  — used as tiebreaker when breaking groups
 * }
 *
 * Public API:
 *   const d = new TeamDistributor(players);
 *   const result = d.generateTeams();
 *
 *   // After distribution, to add a late player:
 *   const updated = d.addPlayer(newPlayer);
 *
 * Return shape (both generateTeams and addPlayer):
 * {
 *   teams: {
 *     teamA: { players: [...], stats: { playerCount, skill, gk, positions } },
 *     teamB: { players: [...], stats: { ... } },
 *   },
 *   skillDifference: number,
 *   isBalanced:      boolean,   // true when skillDifference ≤ 1.5
 *   reasoningLog:    string[],
 * }
 */
class TeamDistributor {
  constructor(players) {
    this.players   = JSON.parse(JSON.stringify(players)); // working pool of unassigned players
    this.total     = this.players.length;
    this.maxTeamSize = Math.ceil(this.total / 2);
    this.teamA     = [];
    this.teamB     = [];
    this.reasoning = [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  _log(msg) {
    this.reasoning.push(msg);
  }

  _nameEq(a, b) {
    return (a || '').toLowerCase() === (b || '').toLowerCase();
  }

  _getStats(team) {
    return {
      playerCount: team.length,
      skill: +(team.reduce((s, p) => s + (p.rating || 0), 0).toFixed(2)),
      gk:    team.reduce((s, p) => s + (p.gkQuotient || 0), 0),
      positions: {
        G:   team.filter(p => p.position === 'G').length,
        D:   team.filter(p => p.position === 'D').length,
        M:   team.filter(p => p.position === 'M').length,
        F:   team.filter(p => p.position === 'F').length,
        Any: team.filter(p => p.position === 'Any').length,
      },
    };
  }

  _hasConstraints(player) {
    return (
      !!player.groupId ||
      (player.playWith    && player.playWith.length    > 0) ||
      (player.playAgainst && player.playAgainst.length > 0)
    );
  }

  // Remove a player from the unassigned pool by id (preferred) or name.
  _removeFromPool(player) {
    const idx = this.players.findIndex(p =>
      (player.id != null && p.id != null && p.id.toString() === player.id.toString()) ||
      this._nameEq(p.name, player.name)
    );
    if (idx !== -1) this.players.splice(idx, 1);
  }

  // Add player to a team; remove them from the pool if still present.
  _placeOnTeam(player, team, teamName) {
    if (team.some(p => this._nameEq(p.name, player.name))) return; // already placed
    this._removeFromPool(player);
    team.push(player);
    this._log(`  ${player.name} → ${teamName}`);
  }

  // Build a snapshot of the current result (does not mutate state).
  _snapshot() {
    const sA = this._getStats(this.teamA);
    const sB = this._getStats(this.teamB);
    const diff = +(Math.abs(sA.skill - sB.skill).toFixed(2));
    return {
      teams: {
        teamA: { players: this.teamA, stats: sA },
        teamB: { players: this.teamB, stats: sB },
      },
      skillDifference: diff,
      isBalanced:      diff <= 1.5,
      reasoningLog:    this.reasoning,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 0 — RESOLVE TRIANGLE PARADOXES (playAgainst)
  //
  // If A wants to play against B, B against C, and C against A, none of the
  // three constraints can be simultaneously satisfied — disable all of them.
  // ─────────────────────────────────────────────────────────────────────────────

  _resolveTriangleParadox() {
    this._log('[Step 0] Checking for playAgainst triangle paradoxes.');
    const all = this.players;

    for (const a of all) {
      if (!a.playAgainst?.length) continue;
      for (const bName of a.playAgainst) {
        const b = all.find(p => this._nameEq(p.name, bName));
        if (!b?.playAgainst?.length) continue;
        for (const cName of b.playAgainst) {
          const c = all.find(p => this._nameEq(p.name, cName));
          if (c?.playAgainst?.some(n => this._nameEq(n, a.name))) {
            this._log(`  Triangle paradox: ${a.name} ↔ ${b.name} ↔ ${c.name} — all playAgainst cleared.`);
            a.playAgainst = [];
            b.playAgainst = [];
            c.playAgainst = [];
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 — GROUP MANAGEMENT
  //
  // Three cases (in order):
  //   a) A group exactly fills one team → assign to A, remaining to B, stop.
  //   b) A group is larger than a team  → break into individuals.
  //   c) Groups cannot be cleanly split into two teams → break the smallest
  //      group; if tied in size, break the one whose last signup was most recent.
  // ─────────────────────────────────────────────────────────────────────────────

  _buildActiveGroups() {
    const groups = {};
    for (const p of this.players) {
      if (!p.groupId) continue;
      if (!groups[p.groupId]) groups[p.groupId] = [];
      groups[p.groupId].push(p);
    }
    return groups;
  }

  // Greedy check: can all groups fit into two bins of ≤ maxTeamSize each?
  _groupsCanFit(groups) {
    const sizes = Object.values(groups).map(g => g.length).sort((a, b) => b - a);
    let binA = 0, binB = 0;
    for (const size of sizes) {
      if      (binA + size <= this.maxTeamSize) binA += size;
      else if (binB + size <= this.maxTeamSize) binB += size;
      else return false;
    }
    return true;
  }

  // Returns true if distribution is complete (exact-group case).
  _manageGroups() {
    this._log('[Step 1] Managing groups.');

    // ── Case a: exact fit → fill one whole team, done ─────────────────────────
    const groups = this._buildActiveGroups();
    for (const key of Object.keys(groups)) {
      if (groups[key].length === this.maxTeamSize) {
        this._log(`  Group "${key}" fills exactly one team → Team A. All others → Team B.`);
        for (const p of groups[key])    this._placeOnTeam(p, this.teamA, 'Team A');
        for (const p of [...this.players]) this._placeOnTeam(p, this.teamB, 'Team B');
        return true; // distribution complete
      }
    }

    // ── Case b: oversized groups → break into individuals ─────────────────────
    const oversized = this._buildActiveGroups();
    for (const [key, members] of Object.entries(oversized)) {
      if (members.length > this.maxTeamSize) {
        this._log(`  Group "${key}" (${members.length}) > maxTeamSize (${this.maxTeamSize}) → breaking into individuals.`);
        for (const p of members) p.groupId = null;
      }
    }

    // ── Case c: groups can't split evenly → break smallest / latest ───────────
    let guard = 0;
    while (guard++ < 20) {
      const active = this._buildActiveGroups();
      if (Object.keys(active).length === 0 || this._groupsCanFit(active)) break;

      // Sort ascending by size, then descending by last signedUpAt (latest first)
      const sorted = Object.keys(active).sort((a, b) => {
        const sa = active[a].length, sb = active[b].length;
        if (sa !== sb) return sa - sb;
        const latestMs = g => Math.max(...active[g].map(p => new Date(p.signedUpAt || 0).getTime()));
        return latestMs(b) - latestMs(a);
      });

      const tgt = sorted[0];
      this._log(`  Groups can't split evenly → breaking "${tgt}" (${active[tgt].length} players, latest signup first).`);
      for (const p of active[tgt]) p.groupId = null;
    }

    return false; // distribution not yet complete
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PREFERENCE HANDLER  (called after placing each player)
  //
  // • playWith   → pull the named player into the same team
  // • playAgainst → pull the named player into the opposing team
  // • If a conflict exists (veto), the placement is reversed
  // • visited Set prevents infinite recursion in preference chains
  //
  // NOTE: preferences are only honoured while the target player is still in the
  // unassigned pool.  Players already placed are not moved here (see addPlayer
  // for the post-distribution case).
  // ─────────────────────────────────────────────────────────────────────────────

  _handlePreferences(player, visited = new Set()) {
    if (visited.has(player.name)) return;
    visited.add(player.name);

    const inA = this.teamA.some(p => this._nameEq(p.name, player.name));
    if (!inA && !this.teamB.some(p => this._nameEq(p.name, player.name))) return;

    const myTeam    = inA ? this.teamA    : this.teamB;
    const theirTeam = inA ? this.teamB    : this.teamA;
    const myName    = inA ? 'Team A'      : 'Team B';
    const theirName = inA ? 'Team B'      : 'Team A';

    // ── playWith: place friend on same team ────────────────────────────────────
    for (const friendName of (player.playWith || [])) {
      const fIdx = this.players.findIndex(p => this._nameEq(p.name, friendName));
      if (fIdx === -1) continue;
      const friend = this.players[fIdx];

      const conflictsOnMySide =
        friend.playAgainst?.some(n => myTeam.some(m => this._nameEq(m.name, n))) ||
        myTeam.some(m => m.playAgainst?.some(n => this._nameEq(n, friend.name)));

      if (conflictsOnMySide) {
        if (theirTeam.length < this.maxTeamSize) {
          this.players.splice(fIdx, 1);
          theirTeam.push(friend);
          this._log(`  VETO: ${player.name} wants ${friend.name} with them but conflict detected → ${friend.name} to ${theirName} instead.`);
          this._handlePreferences(friend, visited);
        }
      } else if (myTeam.length < this.maxTeamSize) {
        this.players.splice(fIdx, 1);
        myTeam.push(friend);
        this._log(`  playWith: ${friend.name} → ${myName} (with ${player.name}).`);
        this._handlePreferences(friend, visited);
      }
    }

    // ── playAgainst: place rival on opposing team ──────────────────────────────
    for (const rivalName of (player.playAgainst || [])) {
      const rIdx = this.players.findIndex(p => this._nameEq(p.name, rivalName));
      if (rIdx === -1) continue;
      const rival = this.players[rIdx];

      const conflictsOnTheirSide =
        rival.playAgainst?.some(n => theirTeam.some(m => this._nameEq(m.name, n))) ||
        theirTeam.some(m => m.playAgainst?.some(n => this._nameEq(n, rival.name)));

      if (conflictsOnTheirSide) {
        if (myTeam.length < this.maxTeamSize) {
          this.players.splice(rIdx, 1);
          myTeam.push(rival);
          this._log(`  VETO: ${player.name} wants ${rival.name} against but conflict on ${theirName} → ${rival.name} to ${myName} instead.`);
          this._handlePreferences(rival, visited);
        }
      } else if (theirTeam.length < this.maxTeamSize) {
        this.players.splice(rIdx, 1);
        theirTeam.push(rival);
        this._log(`  playAgainst: ${rival.name} → ${theirName} (opposing ${player.name}).`);
        this._handlePreferences(rival, visited);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 — GOALKEEPER DISTRIBUTION
  //
  // • Sort GK candidates (gkQuotient ≥ 2) by: gkQuotient desc → rating desc → name asc
  // • First (highest) GK always goes to Team A (Red)
  // • Each subsequent GK goes to whichever team has the lower total GK quotient
  //   (Team A wins ties to keep the pattern alternating)
  // • After placing each GK, run preference handler
  // ─────────────────────────────────────────────────────────────────────────────

  _distributeGoalkeepers() {
    const gkPool = this.players
      .filter(p => (p.gkQuotient || 0) >= 2)
      .sort((a, b) => {
        if ((b.gkQuotient || 0) !== (a.gkQuotient || 0)) return (b.gkQuotient || 0) - (a.gkQuotient || 0);
        if ((b.rating    || 0) !== (a.rating    || 0)) return (b.rating    || 0) - (a.rating    || 0);
        return (a.name || '').localeCompare(b.name || '');
      });

    if (gkPool.length === 0) {
      this._log('[Step 2] No GK candidates (gkQuotient ≥ 2).');
      return;
    }

    this._log(`[Step 2] Distributing ${gkPool.length} GK candidate(s).`);

    let firstGK = true;
    for (const gk of gkPool) {
      this._removeFromPool(gk);

      let targetTeam, targetName;

      if (firstGK) {
        // Highest GK always to Team A (Red) first
        targetTeam = this.teamA;
        targetName = 'Team A (highest GK → Red)';
        firstGK = false;
      } else if (this.teamA.length >= this.maxTeamSize) {
        targetTeam = this.teamB;
        targetName = 'Team B (A full)';
      } else if (this.teamB.length >= this.maxTeamSize) {
        targetTeam = this.teamA;
        targetName = 'Team A (B full)';
      } else {
        const gkA = this._getStats(this.teamA).gk;
        const gkB = this._getStats(this.teamB).gk;
        if (gkA <= gkB) {
          targetTeam = this.teamA;
          targetName = `Team A (GK quotient A=${gkA} ≤ B=${gkB})`;
        } else {
          targetTeam = this.teamB;
          targetName = `Team B (GK quotient B=${gkB} < A=${gkA})`;
        }
      }

      targetTeam.push(gk);
      this._log(`  GK: ${gk.name} (gkQ=${gk.gkQuotient}, rating=${gk.rating || 0}) → ${targetName}.`);
      this._handlePreferences(gk, new Set());
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3 — SKILL-BASED DISTRIBUTION
  //
  // Players are paired from the unassigned pool by closest skill score.
  // Matching order: exact → ±0.5 → ±1.0 → expanding.
  // An imbalance counter tracks which team received the stronger player last; the
  // next unequal pair reverses it.
  //
  // Odd player: when only one player remains, they go to the team with fewer
  // players (or lower total skill if counts are equal).
  // ─────────────────────────────────────────────────────────────────────────────

  _distributeBySkill() {
    if (this.players.length === 0) return;
    this._log(`[Step 3] Skill-based distribution of ${this.players.length} remaining player(s).`);

    this.players.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // imbalance > 0  → Team A received the stronger side of the last unequal pair
    // imbalance ≤ 0  → Team B did (or it's balanced) → Team A gets the stronger next
    let imbalance = 0;

    while (this.players.length > 0) {
      // One team already full — flood remaining into the other
      if (this.teamA.length >= this.maxTeamSize) {
        const p = this.players.shift();
        this.teamB.push(p);
        this._log(`  Team A full → ${p.name} to Team B.`);
        this._handlePreferences(p);
        continue;
      }
      if (this.teamB.length >= this.maxTeamSize) {
        const p = this.players.shift();
        this.teamA.push(p);
        this._log(`  Team B full → ${p.name} to Team A.`);
        this._handlePreferences(p);
        continue;
      }

      const p1  = this.players.shift();
      const p1r = p1.rating || 0;

      // Last (odd) player — place on the weaker / smaller team
      if (this.players.length === 0) {
        const sA = this._getStats(this.teamA);
        const sB = this._getStats(this.teamB);
        const goA = this.teamA.length < this.teamB.length ||
                   (this.teamA.length === this.teamB.length && sA.skill <= sB.skill);
        if (goA) {
          this.teamA.push(p1);
          this._log(`  Odd player ${p1.name} (${p1r}) → Team A (fewer/lower skill).`);
          this._handlePreferences(p1);
        } else {
          this.teamB.push(p1);
          this._log(`  Odd player ${p1.name} (${p1r}) → Team B (fewer/lower skill).`);
          this._handlePreferences(p1);
        }
        break;
      }

      // Find closest-skill partner from the remaining pool
      // Try exact match first, then expand by 0.5 increments
      let p2Idx = -1;
      for (let delta = 0; delta <= 10; delta += 0.5) {
        const idx = this.players.findIndex(p => Math.abs((p.rating || 0) - p1r) <= delta + 1e-9);
        if (idx !== -1) { p2Idx = idx; break; }
      }
      if (p2Idx === -1) p2Idx = 0; // fallback: next in sorted order

      const p2  = this.players.splice(p2Idx, 1)[0];
      const p2r = p2.rating || 0;

      const stronger   = (p1r >= p2r) ? p1 : p2;
      const weaker     = (p1r >= p2r) ? p2 : p1;
      const pairDiff   = Math.abs(p1r - p2r);

      let toA, toB;
      if (imbalance <= 0) {
        // Team A is behind or equal — give it the stronger player
        toA = stronger; toB = weaker;
        imbalance += pairDiff;
      } else {
        // Team B is behind — give it the stronger player
        toA = weaker; toB = stronger;
        imbalance -= pairDiff;
      }

      this.teamA.push(toA);
      this.teamB.push(toB);
      this._log(
        `  Pair: ${toA.name}(${toA.rating || 0}) → A, ${toB.name}(${toB.rating || 0}) → B.` +
        ` Δskill=${pairDiff.toFixed(2)}, imbalance=${imbalance.toFixed(2)}`
      );

      this._handlePreferences(toA);
      this._handlePreferences(toB);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4 — SKILL BALANCE (post-distribution)
  //
  // If the total skill difference exceeds 1.5, swap unconstrained players to
  // reduce it.  At most 20 iterations.
  // ─────────────────────────────────────────────────────────────────────────────

  _balanceSkill() {
    this._log('[Step 4] Post-distribution skill balance (threshold: 1.5).');

    for (let i = 0; i < 20; i++) {
      const sA   = this._getStats(this.teamA);
      const sB   = this._getStats(this.teamB);
      const diff = sA.skill - sB.skill;
      if (Math.abs(diff) <= 1.5) {
        this._log(`  Skill diff ${Math.abs(diff).toFixed(2)} ≤ 1.5 — balanced.`);
        break;
      }

      const stronger     = diff > 0 ? this.teamA : this.teamB;
      const weaker       = diff > 0 ? this.teamB : this.teamA;
      const targetShift  = Math.abs(diff) / 2;

      let best = null, bestDist = Infinity;
      for (const s of stronger) {
        if (this._hasConstraints(s)) continue;
        for (const w of weaker) {
          if (this._hasConstraints(w)) continue;
          const shift = (s.rating || 0) - (w.rating || 0);
          if (shift > 0) {
            const d = Math.abs(shift - targetShift);
            if (d < bestDist) { bestDist = d; best = { s, w }; }
          }
        }
      }

      if (!best) {
        this._log(`  No unconstrained swap available. Skill diff remains ${Math.abs(diff).toFixed(2)}.`);
        break;
      }

      stronger.splice(stronger.indexOf(best.s), 1);
      weaker.splice(weaker.indexOf(best.w), 1);
      stronger.push(best.w);
      weaker.push(best.s);

      const newDiff = Math.abs(this._getStats(this.teamA).skill - this._getStats(this.teamB).skill);
      this._log(`  Swap: ${best.s.name} ↔ ${best.w.name}. Diff: ${Math.abs(diff).toFixed(2)} → ${newDiff.toFixed(2)}.`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5 — POSITION BALANCE
  //
  // For each position (G, D, M, F): if one team has ≥ 2 more players in that
  // position, swap the most skill-neutral unconstrained pair (one per team) whose
  // positions differ, provided the swap keeps the overall skill diff ≤ 1.5.
  // ─────────────────────────────────────────────────────────────────────────────

  _balancePositions() {
    this._log('[Step 5] Balancing positions.');
    const positions = ['G', 'D', 'M', 'F'];

    for (const pos of positions) {
      for (let iter = 0; iter < 10; iter++) {
        const aCount = this.teamA.filter(p => p.position === pos).length;
        const bCount = this.teamB.filter(p => p.position === pos).length;
        if (Math.abs(aCount - bCount) <= 1) break;

        const more     = aCount > bCount ? this.teamA : this.teamB;
        const less     = aCount > bCount ? this.teamB : this.teamA;
        const moreName = aCount > bCount ? 'Team A'   : 'Team B';
        const lessName = aCount > bCount ? 'Team B'   : 'Team A';

        const skillA = this.teamA.reduce((s, p) => s + (p.rating || 0), 0);
        const skillB = this.teamB.reduce((s, p) => s + (p.rating || 0), 0);

        let swapped = false;
        const outPool = more.filter(p => p.position === pos && !this._hasConstraints(p));

        for (const out of outPool) {
          // Prefer swapping in a player whose position is also over-represented in `less`
          const inPool = less
            .filter(p => p.position !== pos && !this._hasConstraints(p))
            .sort((a, b) => Math.abs((a.rating || 0) - (out.rating || 0)) - Math.abs((b.rating || 0) - (out.rating || 0)));

          for (const inn of inPool) {
            let newA, newB;
            if (more === this.teamA) {
              newA = skillA - (out.rating || 0) + (inn.rating || 0);
              newB = skillB - (inn.rating || 0) + (out.rating || 0);
            } else {
              newB = skillB - (out.rating || 0) + (inn.rating || 0);
              newA = skillA - (inn.rating || 0) + (out.rating || 0);
            }

            if (Math.abs(newA - newB) <= 1.5) {
              more.splice(more.indexOf(out), 1);
              less.splice(less.indexOf(inn), 1);
              more.push(inn);
              less.push(out);
              this._log(
                `  Position swap: ${out.name}(${pos}) ${moreName} ↔ ${lessName} ${inn.name}(${inn.position}).` +
                ` Skill diff after: ${Math.abs(newA - newB).toFixed(2)}`
              );
              swapped = true;
              break;
            }
          }
          if (swapped) break;
        }

        if (!swapped) {
          this._log(`  Cannot balance ${pos}s without breaking constraints or exceeding skill threshold.`);
          break;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC: addPlayer  (call after generateTeams to add a late registrant)
  //
  // Rule:
  //   • Add to the team with fewer players.
  //   • If counts are equal, add to the team with lower total skill.
  //   • Then honour preferences by moving at most ONE already-placed player
  //     to satisfy a playWith or playAgainst constraint.
  // ─────────────────────────────────────────────────────────────────────────────

  addPlayer(player) {
    const sA = this._getStats(this.teamA);
    const sB = this._getStats(this.teamB);

    let targetTeam, targetName, otherTeam, otherName;
    if (this.teamA.length < this.teamB.length ||
       (this.teamA.length === this.teamB.length && sA.skill <= sB.skill)) {
      targetTeam = this.teamA; targetName = 'Team A';
      otherTeam  = this.teamB; otherName  = 'Team B';
    } else {
      targetTeam = this.teamB; targetName = 'Team B';
      otherTeam  = this.teamA; otherName  = 'Team A';
    }

    targetTeam.push(player);
    this._log(`[addPlayer] ${player.name} → ${targetName}.`);

    let moved = 0;

    // playWith: move a friend from the other team here (at most once)
    for (const friendName of (player.playWith || [])) {
      if (moved >= 1) break;
      const friendInOther = otherTeam.find(p => this._nameEq(p.name, friendName));
      if (friendInOther && !this._hasConstraints(friendInOther)) {
        otherTeam.splice(otherTeam.indexOf(friendInOther), 1);
        targetTeam.push(friendInOther);
        this._log(`  addPlayer pref: ${friendInOther.name} moved to ${targetName} (playWith ${player.name}).`);
        moved++;
      }
    }

    // playAgainst: move a rival from this team to the other (at most once total)
    for (const rivalName of (player.playAgainst || [])) {
      if (moved >= 1) break;
      const rivalInSame = targetTeam.find(p => this._nameEq(p.name, rivalName));
      if (rivalInSame && !this._hasConstraints(rivalInSame)) {
        targetTeam.splice(targetTeam.indexOf(rivalInSame), 1);
        otherTeam.push(rivalInSame);
        this._log(`  addPlayer pref: ${rivalInSame.name} moved to ${otherName} (playAgainst ${player.name}).`);
        moved++;
      }
    }

    return this._snapshot();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN ENTRY POINT
  // ─────────────────────────────────────────────────────────────────────────────

  generateTeams() {
    if (this.total === 0) {
      this._log('No players to distribute.');
      return this._snapshot();
    }

    this._resolveTriangleParadox();
    const done = this._manageGroups();

    if (!done) {
      this._distributeGoalkeepers();
      this._distributeBySkill();
      this._balanceSkill();
      this._balancePositions();
    }

    const sA = this._getStats(this.teamA);
    const sB = this._getStats(this.teamB);
    this._log(
      `[Done] Team A: ${this.teamA.length} players, skill=${sA.skill}. ` +
      `Team B: ${this.teamB.length} players, skill=${sB.skill}. ` +
      `Diff: ${Math.abs(sA.skill - sB.skill).toFixed(2)}.`
    );

    return this._snapshot();
  }
}

module.exports = TeamDistributor;
