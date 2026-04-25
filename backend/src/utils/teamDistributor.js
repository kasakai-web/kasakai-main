class TeamDistributor {
  constructor(players) {
    this.players = players;
    this.teamA = [];
    this.teamB = [];
    this.assigned = new Set();
  }

  getPlayerStats(team) {
    let stats = {
      playerCount: team.length,
      totalSkill: 0,
      totalGKQuotient: 0,
      positionsMap: { 'G': 0, 'D': 0, 'M': 0, 'F': 0, 'Any': 0 }
    };

    team.forEach(p => {
      stats.totalSkill += p.rating;
      stats.totalGKQuotient += p.gkQuotient;

      if (stats.positionsMap[p.position] !== undefined) {
        stats.positionsMap[p.position]++;
      }
    });

    return stats;
  }

  assignPlayer(player, targetTeam, oppositeTeam) {
    if (!player || this.assigned.has(player.name)) return;

    targetTeam.push(player);
    this.assigned.add(player.name);

    // playWith
    if (player.playWith && Array.isArray(player.playWith)) {
      player.playWith.forEach(partnerName => {
        let partner = this.players.find(p => p.name === partnerName);
        if (partner && !this.assigned.has(partner.name)) {
          this.assignPlayer(partner, targetTeam, oppositeTeam);
        }
      });
    }

    // playAgainst
    if (player.playAgainst && Array.isArray(player.playAgainst)) {
      player.playAgainst.forEach(opponentName => {
        let opponent = this.players.find(p => p.name === opponentName);
        if (opponent && !this.assigned.has(opponent.name)) {
          this.assignPlayer(opponent, oppositeTeam, targetTeam);
        }
      });
    }
  }

  formatPositions(positionsMap) {
    let formatted = [];
    for (const [pos, count] of Object.entries(positionsMap)) {
      formatted.push(`${pos}: ${count}`);
    }
    return formatted;
  }

  generateTeams() {
    let sortedPlayers = [...this.players].sort((a, b) => {
      if (b.gkQuotient !== a.gkQuotient) return b.gkQuotient - a.gkQuotient;
      return b.rating - a.rating;
    });

    sortedPlayers.forEach(player => {
      if (this.assigned.has(player.name)) return;

      let statsA = this.getPlayerStats(this.teamA);
      let statsB = this.getPlayerStats(this.teamB);

      let targetTeam = this.teamA;
      let oppositeTeam = this.teamB;

      if (statsA.totalGKQuotient > statsB.totalGKQuotient) {
        targetTeam = this.teamB;
        oppositeTeam = this.teamA;
      } else if (statsA.totalGKQuotient === statsB.totalGKQuotient) {
        if (statsA.totalSkill > statsB.totalSkill) {
          targetTeam = this.teamB;
          oppositeTeam = this.teamA;
        } else if (
          statsA.totalSkill === statsB.totalSkill &&
          statsA.playerCount > statsB.playerCount
        ) {
          targetTeam = this.teamB;
          oppositeTeam = this.teamA;
        }
      }

      this.assignPlayer(player, targetTeam, oppositeTeam);
    });

    let finalStatsA = this.getPlayerStats(this.teamA);
    let finalStatsB = this.getPlayerStats(this.teamB);
    let skillDiff = Math.abs(finalStatsA.totalSkill - finalStatsB.totalSkill).toFixed(1);

    return {
      status: "SUCCESS",
      matchFormat: `${this.players.length / 2}v${this.players.length / 2}`,
      skillDifference: parseFloat(skillDiff),
      isBalanced: parseFloat(skillDiff) <= 1.5,
      teams: {
        teamA: {
          players: this.teamA.map(p => p.name),
          stats: {
            playerCount: finalStatsA.playerCount,
            totalSkill: finalStatsA.totalSkill,
            totalGKQuotient: finalStatsA.totalGKQuotient,
            positions: this.formatPositions(finalStatsA.positionsMap)
          }
        },
        teamB: {
          players: this.teamB.map(p => p.name),
          stats: {
            playerCount: finalStatsB.playerCount,
            totalSkill: finalStatsB.totalSkill,
            totalGKQuotient: finalStatsB.totalGKQuotient,
            positions: this.formatPositions(finalStatsB.positionsMap)
          }
        }
      }
    };
  }
}

module.exports = TeamDistributor;