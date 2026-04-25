class TeamDistributor {
  constructor(players) {
    this.players = JSON.parse(JSON.stringify(players));
    this.maxTeamSize = Math.ceil(this.players.length / 2);
    this.teamA = [];
    this.teamB = [];
    this.reasoning = [];
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  logReason(msg) {
    this.reasoning.push(msg);
  }

  getStats(team) {
    return {
      playerCount: team.length,
      skill: team.reduce((s, p) => s + p.rating, 0),
      gk: team.reduce((s, p) => s + p.gkQuotient, 0),
      positions: {
        G: team.filter(p => p.position === 'G').length,
        D: team.filter(p => p.position === 'D').length,
        M: team.filter(p => p.position === 'M').length,
        F: team.filter(p => p.position === 'F').length,
      },
    };
  }

  hasConstraints(player) {
    return (
      player.groupId ||
      (player.playWith && player.playWith.length > 0) ||
      (player.playAgainst && player.playAgainst.length > 0)
    );
  }

  // ─────────────────────────────────────────
  // STEP 0a: RESOLVE TRIANGLE PARADOX
  // ─────────────────────────────────────────

  resolveTriangleParadox() {
    this.logReason('Checking for Triangle Paradoxes in playAgainst constraints.');

    for (let a of this.players) {
      if (!a.playAgainst || a.playAgainst.length === 0) continue;

      for (let bName of a.playAgainst) {
        let b = this.players.find(
          p => p.name.toLowerCase() === bName.toLowerCase()
        );
        if (!b || !b.playAgainst) continue;

        for (let cName of b.playAgainst) {
          let c = this.players.find(
            p => p.name.toLowerCase() === cName.toLowerCase()
          );
          if (
            c &&
            c.playAgainst &&
            c.playAgainst.some(
              name => name.toLowerCase() === a.name.toLowerCase()
            )
          ) {
            this.logReason(
              `Triangle paradox found between ${a.name}, ${b.name}, and ${c.name}. Constraints disabled.`
            );
            a.playAgainst = [];
            b.playAgainst = [];
            c.playAgainst = [];
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // STEP 0b: MANAGE GROUPS
  // ─────────────────────────────────────────
  //
  // GAP #3 (low priority): balanceSkill() and balancePositions() swap players
  // without checking groupId pairs — so two players sharing a groupId could
  // theoretically end up on opposite teams after balancing.
  // Future fix: add a post-balance group-integrity check that swaps them back
  // if they were split, accepting a slightly worse skill diff if needed.

  manageGroups() {
    let groups = {};

    this.players.forEach(p => {
      let gId = p.groupId || `solo_${p.name}`;
      if (!groups[gId]) groups[gId] = [];
      groups[gId].push(p);
    });

    let groupKeys = Object.keys(groups).filter(k => !k.startsWith('solo_'));

    groupKeys.forEach(key => {
      let group = groups[key];

      if (group.length === this.maxTeamSize && this.teamA.length === 0) {
        this.logReason(
          `Group ${key} matches exact max team size. Assigning all to Team A.`
        );
        this.teamA.push(...group);
        this.players = this.players.filter(p => !group.includes(p));
      } else if (group.length > this.maxTeamSize) {
        this.logReason(
          `Group ${key} is larger than max team size. Breaking into individuals.`
        );
        group.forEach(p => (p.groupId = null));
      }
    });

    let groupedPlayers = this.players.filter(p => p.groupId);
    if (groupedPlayers.length > this.maxTeamSize * 2) {
      this.logReason(
        'Too many grouped players. Breaking smallest group to ensure fit.'
      );
      let smallestGroupKey = groupKeys.sort(
        (a, b) => groups[a].length - groups[b].length
      )[0];
      if (smallestGroupKey) {
        groups[smallestGroupKey].forEach(p => (p.groupId = null));
      }
    }
  }

  // ─────────────────────────────────────────
  // STEP 1: DISTRIBUTE GOALKEEPERS
  // ─────────────────────────────────────────

  distributeGoalkeepers() {
    this.logReason('Distributing players with GK Quotient >= 2.');

    let gks = this.players.filter(p => p.gkQuotient >= 2);
    this.players = this.players.filter(p => p.gkQuotient < 2);

    gks.sort((a, b) => {
      if (b.gkQuotient !== a.gkQuotient) return b.gkQuotient - a.gkQuotient;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });

    for (let gk of gks) {
      let statsA = this.getStats(this.teamA);
      let statsB = this.getStats(this.teamB);

      let canAddToA = this.teamA.length < this.maxTeamSize;
      let canAddToB = this.teamB.length < this.maxTeamSize;

      if (canAddToA && canAddToB) {
        if (statsA.gk <= statsB.gk) {
          this.teamA.push(gk);
          this.logReason(`Added GK ${gk.name} to Team A.`);
        } else {
          this.teamB.push(gk);
          this.logReason(`Added GK ${gk.name} to Team B.`);
        }
      } else if (canAddToA) {
        this.teamA.push(gk);
        this.logReason(`Added GK ${gk.name} to Team A (Team B is full).`);
      } else if (canAddToB) {
        this.teamB.push(gk);
        this.logReason(`Added GK ${gk.name} to Team B (Team A is full).`);
      }

      this.handlePreferences(gk);
    }
  }

  // ─────────────────────────────────────────
  // PREFERENCE HANDLER (playWith / playAgainst)
  // ─────────────────────────────────────────
  //
  // FIX #1 (done): Added `visited` Set to prevent infinite recursion in long
  // or cyclic preference chains (e.g. A→B→C→A).
  //
  // GAP #2 (medium priority): Preferences only trigger if the target player is
  // still in this.players (unassigned). If both players are already on teams,
  // no correction happens. Example: A wants B on same team, but B was already
  // assigned to the opposite team — the system won't fix it.
  // Future fix: add a post-distribution preference audit pass that detects
  // violated playWith/playAgainst constraints and attempts corrective swaps,
  // similar to how balanceSkill() works.

  handlePreferences(player, visited = new Set()) {
    if (visited.has(player.name)) return;
    visited.add(player.name);

    let currentTeam = this.teamA.includes(player)
      ? this.teamA
      : this.teamB.includes(player)
      ? this.teamB
      : null;

    if (!currentTeam) return;

    let oppositeTeam = currentTeam === this.teamA ? this.teamB : this.teamA;
    let currentTeamName = currentTeam === this.teamA ? 'Team A' : 'Team B';
    let oppositeTeamName = oppositeTeam === this.teamA ? 'Team A' : 'Team B';

    // playWith
    if (player.playWith && player.playWith.length > 0) {
      [...player.playWith].forEach(friendName => {
        let friendIndex = this.players.findIndex(
          p => p.name.toLowerCase() === friendName.toLowerCase()
        );
        if (friendIndex === -1) return;

        let friend = this.players[friendIndex];

        let friendWantsAgainstTarget =
          friend.playAgainst &&
          currentTeam.some(m =>
            friend.playAgainst.some(
              name => name.toLowerCase() === m.name.toLowerCase()
            )
          );

        let targetWantsAgainstFriend = currentTeam.some(
          m =>
            m.playAgainst &&
            m.playAgainst.some(
              name => name.toLowerCase() === friend.name.toLowerCase()
            )
        );

        if (friendWantsAgainstTarget || targetWantsAgainstFriend) {
          this.logReason(
            `CONFLICT VETO: ${player.name} wants ${friend.name} on same team, but there is an Against conflict on ${currentTeamName}. Forcing ${friend.name} to ${oppositeTeamName}.`
          );
          if (oppositeTeam.length < this.maxTeamSize) {
            this.players.splice(friendIndex, 1);
            oppositeTeam.push(friend);
            this.handlePreferences(friend, visited);
          }
        } else if (currentTeam.length < this.maxTeamSize) {
          this.players.splice(friendIndex, 1);
          currentTeam.push(friend);
          this.logReason(
            `Added ${friend.name} to same team as ${player.name} (playWith preference).`
          );
          this.handlePreferences(friend, visited);
        }
      });
    }

    // playAgainst
    if (player.playAgainst && player.playAgainst.length > 0) {
      [...player.playAgainst].forEach(rivalName => {
        let rivalIndex = this.players.findIndex(
          p => p.name.toLowerCase() === rivalName.toLowerCase()
        );
        if (rivalIndex === -1) return;

        let rival = this.players[rivalIndex];

        let rivalWantsAgainstOpposite =
          rival.playAgainst &&
          oppositeTeam.some(m =>
            rival.playAgainst.some(
              name => name.toLowerCase() === m.name.toLowerCase()
            )
          );

        let oppositeWantsAgainstRival = oppositeTeam.some(
          m =>
            m.playAgainst &&
            m.playAgainst.some(
              name => name.toLowerCase() === rival.name.toLowerCase()
            )
        );

        if (rivalWantsAgainstOpposite || oppositeWantsAgainstRival) {
          this.logReason(
            `CONFLICT VETO: ${player.name} wants ${rival.name} on ${oppositeTeamName}, but ${rival.name} has a conflict there. Keeping ${rival.name} on ${currentTeamName}.`
          );
          if (currentTeam.length < this.maxTeamSize) {
            this.players.splice(rivalIndex, 1);
            currentTeam.push(rival);
            this.handlePreferences(rival, visited);
          }
        } else if (oppositeTeam.length < this.maxTeamSize) {
          this.players.splice(rivalIndex, 1);
          oppositeTeam.push(rival);
          this.logReason(
            `Added ${rival.name} to opposite team of ${player.name} (playAgainst preference).`
          );
          this.handlePreferences(rival, visited);
        }
      });
    }
  }

  // ─────────────────────────────────────────
  // STEP 2: DISTRIBUTE BY SKILL
  // ─────────────────────────────────────────

  distributeBySkill() {
    this.logReason('Distributing remaining players by skill matching.');

    this.players.sort((a, b) => b.rating - a.rating);
    let skillImbalance = 0;

    while (this.players.length > 0) {
      if (this.teamA.length >= this.maxTeamSize) {
        let p = this.players.shift();
        this.teamB.push(p);
        this.logReason(`Team A is full. Assigned ${p.name} to Team B.`);
        this.handlePreferences(p);
        continue;
      }
      if (this.teamB.length >= this.maxTeamSize) {
        let p = this.players.shift();
        this.teamA.push(p);
        this.logReason(`Team B is full. Assigned ${p.name} to Team A.`);
        this.handlePreferences(p);
        continue;
      }

      let p1 = this.players.shift();

      // Last odd player
      if (this.players.length === 0) {
        if (this.teamA.length < this.teamB.length) {
          this.teamA.push(p1);
          this.logReason(
            `Assigned final odd player ${p1.name} to Team A to balance numbers.`
          );
        } else if (this.teamB.length < this.teamA.length) {
          this.teamB.push(p1);
          this.logReason(
            `Assigned final odd player ${p1.name} to Team B to balance numbers.`
          );
        } else if (skillImbalance <= 0) {
          this.teamA.push(p1);
          this.logReason(
            `Assigned final odd player ${p1.name} to Team A to balance skill.`
          );
        } else {
          this.teamB.push(p1);
          this.logReason(
            `Assigned final odd player ${p1.name} to Team B to balance skill.`
          );
        }
        break;
      }

      // Find a skill-matched pair
      let matchIndex = this.players.findIndex(p => p.rating === p1.rating);
      if (matchIndex === -1) {
        matchIndex = this.players.findIndex(
          p => Math.abs(p.rating - p1.rating) <= 0.5
        );
      }

      let p2 =
        matchIndex !== -1
          ? this.players.splice(matchIndex, 1)[0]
          : this.players.shift();

      if (skillImbalance <= 0) {
        if (p1.rating >= p2.rating) {
          this.teamA.push(p1);
          this.teamB.push(p2);
        } else {
          this.teamA.push(p2);
          this.teamB.push(p1);
        }
        skillImbalance += Math.abs(p1.rating - p2.rating);
        this.logReason(`Paired ${p1.name} & ${p2.name}. Stronger to Team A.`);
      } else {
        if (p1.rating >= p2.rating) {
          this.teamB.push(p1);
          this.teamA.push(p2);
        } else {
          this.teamB.push(p2);
          this.teamA.push(p1);
        }
        skillImbalance -= Math.abs(p1.rating - p2.rating);
        this.logReason(
          `Paired ${p1.name} & ${p2.name}. Stronger to Team B to reverse imbalance.`
        );
      }

      this.handlePreferences(p1);
      this.handlePreferences(p2);
    }
  }

  // ─────────────────────────────────────────
  // STEP 3: BALANCE SKILL
  // ─────────────────────────────────────────

  balanceSkill() {
    this.logReason('Checking final skill balance (max allowed difference: 1.5).');

    let maxIterations = 20;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      let statsA = this.getStats(this.teamA);
      let statsB = this.getStats(this.teamB);
      let diff = statsA.skill - statsB.skill;

      if (Math.abs(diff) <= 1.5) {
        this.logReason(
          `Skill difference is ${Math.abs(diff).toFixed(1)}, within the 1.5 limit.`
        );
        break;
      }

      let strongerTeam = diff > 0 ? this.teamA : this.teamB;
      let weakerTeam = diff > 0 ? this.teamB : this.teamA;
      let strongerName = diff > 0 ? 'Team A' : 'Team B';
      let weakerName = diff > 0 ? 'Team B' : 'Team A';

      let targetShift = Math.abs(diff) / 2;
      let bestSwap = null;
      let bestSwapDiff = Infinity;

      for (let pStrong of strongerTeam) {
        if (this.hasConstraints(pStrong)) continue;

        for (let pWeak of weakerTeam) {
          if (this.hasConstraints(pWeak)) continue;

          let shift = pStrong.rating - pWeak.rating;
          if (shift > 0) {
            let distanceToTarget = Math.abs(shift - targetShift);
            if (distanceToTarget < bestSwapDiff) {
              bestSwapDiff = distanceToTarget;
              bestSwap = { pStrong, pWeak };
            }
          }
        }
      }

      if (bestSwap) {
        strongerTeam.splice(strongerTeam.indexOf(bestSwap.pStrong), 1);
        weakerTeam.splice(weakerTeam.indexOf(bestSwap.pWeak), 1);
        strongerTeam.push(bestSwap.pWeak);
        weakerTeam.push(bestSwap.pStrong);
        this.logReason(
          `Swapped ${bestSwap.pStrong.name} (${strongerName}) and ${bestSwap.pWeak.name} (${weakerName}) to reduce skill difference.`
        );
      } else {
        this.logReason(
          `No valid swap found without breaking constraints. Skill difference remains ${Math.abs(diff).toFixed(1)}.`
        );
        break;
      }
    }
  }

  // ─────────────────────────────────────────
  // STEP 4: BALANCE POSITIONS
  // ─────────────────────────────────────────

  balancePositions() {
    this.logReason(
      'Balancing positions (respecting constraints and 1.5 skill gap limit).'
    );

    const positions = ['G', 'D', 'M', 'F'];
    const maxLoops = 10;

    for (let pos of positions) {
      let loops = 0;

      while (loops < maxLoops) {
        loops++;

        let aCount = this.teamA.filter(p => p.position === pos).length;
        let bCount = this.teamB.filter(p => p.position === pos).length;

        if (Math.abs(aCount - bCount) <= 1) break;

        let teamWithMore = aCount > bCount ? this.teamA : this.teamB;
        let teamWithLess = aCount > bCount ? this.teamB : this.teamA;
        let swapped = false;

        let outCandidates = teamWithMore.filter(
          p => p.position === pos && !this.hasConstraints(p)
        );

        for (let candidateOut of outCandidates) {
          let inCandidates = teamWithLess.filter(
            p => p.position !== pos && !this.hasConstraints(p)
          );

          // Prefer swapping in players whose position is over-represented in teamWithLess
          inCandidates.sort((p1, p2) => {
            let diff1 =
              teamWithLess.filter(x => x.position === p1.position).length -
              teamWithMore.filter(x => x.position === p1.position).length;
            let diff2 =
              teamWithLess.filter(x => x.position === p2.position).length -
              teamWithMore.filter(x => x.position === p2.position).length;
            return diff2 - diff1;
          });

          for (let candidateIn of inCandidates) {
            let skillA = this.teamA.reduce((s, p) => s + p.rating, 0);
            let skillB = this.teamB.reduce((s, p) => s + p.rating, 0);
            let newSkillA, newSkillB;

            if (teamWithMore === this.teamA) {
              newSkillA = skillA - candidateOut.rating + candidateIn.rating;
              newSkillB = skillB - candidateIn.rating + candidateOut.rating;
            } else {
              newSkillB = skillB - candidateOut.rating + candidateIn.rating;
              newSkillA = skillA - candidateIn.rating + candidateOut.rating;
            }

            if (Math.abs(newSkillA - newSkillB) <= 1.5) {
              teamWithMore.splice(teamWithMore.indexOf(candidateOut), 1);
              teamWithLess.splice(teamWithLess.indexOf(candidateIn), 1);
              teamWithMore.push(candidateIn);
              teamWithLess.push(candidateOut);

              this.logReason(
                `Swapped ${candidateOut.name} (${candidateOut.position}) with ${candidateIn.name} (${candidateIn.position}) to balance ${pos}s. Skill diff: ${Math.abs(newSkillA - newSkillB).toFixed(1)}`
              );
              swapped = true;
              break;
            }
          }

          if (swapped) break;
        }

        if (!swapped) {
          this.logReason(
            `Could not balance ${pos}s without breaking constraints or exceeding 1.5 skill limit.`
          );
          break;
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // MAIN ENTRY POINT
  // ─────────────────────────────────────────

  generateTeams() {
    this.resolveTriangleParadox();
    this.manageGroups();
    this.distributeGoalkeepers();
    this.distributeBySkill();
    this.balanceSkill();
    this.balancePositions();

    let skillDifference = Math.abs(
      this.getStats(this.teamA).skill - this.getStats(this.teamB).skill
    );

    return {
      teams: {
        teamA: {
          players: this.teamA,
        },
        teamB: {
          players: this.teamB,
        },
      },
      skillDifference,
      isBalanced: skillDifference <= 1.5,
      reasoningLog: this.reasoning,
    };
  }
}

module.exports = TeamDistributor;