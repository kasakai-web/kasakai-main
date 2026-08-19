
const GAME_RULES: string[] = [
  "Punctuality is mandatory. Report by the listed reporting time. Late arrivals may not be allowed to join.",
  "Pay before you play. Ensure your wallet is recharged before the game. No balance means no entry.",
  "Late back outs disrupt the game. Plan ahead and respect the community's time.",
  "No shows will be penalized. Signing up and not showing up without backing out will result in a penalty deducted from your wallet.",
  "Respect the agreed team/position distribution. Discuss any changes with your teammates.",
  "Keep it controlled. Dangerous tackles, excessive physicality, and verbal abuse will not be tolerated and may result in removal from future games.",
  "Respect the organiser. Their decisions on the day are final. Raise disputes after the game, not during.",
  "Guests are your responsibility. Misconduct by your +1 reflects on you.",
  "Acknowledge the pre-game message. Confirm you are on your way when you receive the morning message.",
  "Rate your experience. Honest feedback after each game helps improve the community for everyone.",
];

export function GameRules() {
  return (
    <ol className="pd-rules-list">
      {GAME_RULES.map((rule, i) => (
        <li key={i} className="pd-rules-item">
          <span className="pd-rules-num">{i + 1}.</span>
          <span className="pd-rules-text">{rule}</span>
        </li>
      ))}
    </ol>
  );
}
