class GameDecisionEngine {
  constructor(playerCount, preferences = {}) {
    this.playerCount = playerCount;
    this.preferences = preferences; // optional (7v7, 5v5 etc)
  }

  evaluateAt8PM() {
    if (this.playerCount < 8) {
      return {
        action: "SUGGEST_CANCEL",
        message: "Less than 8 players. Suggest cancelling the game."
      };
    }

    if (this.playerCount >= 12) {
      return {
        action: "CONFIRM",
        format: this.getFormat(),
        message: "Enough players. Game can be confirmed."
      };
    }

    return {
      action: "WAIT",
      message: "Wait for more players."
    };
  }

  evaluateAt10PM() {
    if (this.playerCount < 10) {
      return {
        action: "CANCEL",
        message: "Less than 10 players. Game cancelled."
      };
    }

    if (this.playerCount >= 10 && this.playerCount <= 14) {
      return {
        action: "CONFIRM",
        format: "7v7",
        message: "Game confirmed as 7v7."
      };
    }

    if (this.playerCount > 14) {
      return {
        action: "CONFIRM",
        format: this.getFormat(),
        message: "Game confirmed with bigger format."
      };
    }
  }

  evaluateBeforeGame() {
    if (this.playerCount < 10) {
      return {
        action: "FORMAT_CHANGE",
        format: this.getFormat(),
        message: "Players dropped. Adjusting format."
      };
    }

    return {
      action: "NO_CHANGE",
      message: "No change required."
    };
  }

  getFormat() {
    const perTeam = Math.floor(this.playerCount / 2);
    return `${perTeam}v${perTeam}`;
  }
}

module.exports = GameDecisionEngine;