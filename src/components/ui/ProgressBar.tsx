import { useEffect, useRef, useState } from "react";
import   "./ProgressBar.css" 


interface ProgressBarProps {
  spotsTotal: number;
  spotsLeft: number;
} 


function getDisplayFillPercentage(actual: number): number {
  const actualPct = Math.min(100, Math.max(0, actual)); 
  if (actualPct <= 50) return actualPct;
  
  const addOn=50 + Math.sqrt((actualPct - 50) / 50) * 50; 
  return addOn;
}
const ProgressBar = ({spotsTotal,spotsLeft}: ProgressBarProps) => {
  let fillClass:string = "mid"; 

   const fillPercentage = spotsTotal > 0 ? ((spotsTotal - spotsLeft) / spotsTotal) * 100 : 0;  

  const displayFillPercentage = getDisplayFillPercentage(fillPercentage);
  // const displayFillPercentage = fillPercentage;
  
  if (displayFillPercentage > 80) fillClass = "low";
  if (displayFillPercentage < 50) fillClass = "high";
   
   // Flash the spots count when it changes (someone just registered or backed out)
  const prevSpots = useRef(spotsLeft);
  const [spotsFlash, setSpotsFlash] = useState<"down" | "up" | null>(null);
  useEffect(() => {
    if (prevSpots.current === spotsLeft) return;
    const direction = spotsLeft < prevSpots.current ? "down" : "up";
    prevSpots.current = spotsLeft;
    const t = setTimeout(() => {
      setSpotsFlash(direction);
      setTimeout(() => setSpotsFlash(null), 1200);
    }, 0);
    return () => clearTimeout(t);
  }, [spotsLeft]);
  return (
    <div className="capacity-section">
        <div className="capacity-bar">
          <div
            className={`capacity-fill ${fillClass}`}
            style={{ width: `${displayFillPercentage}%`, transition: "width 0.6s ease" }}
          ></div>
        </div>
        <div className="capacity-text">
          <span
            className="players-count"
            style={spotsFlash === "down" ? { color: "#f87171" } : spotsFlash === "up" ? { color: "#4ade80" } : undefined}
          >
            {spotsTotal - spotsLeft}
          </span>
          <span className="total-slots">of {spotsTotal}</span>
        </div>
      </div>
  )
}

export default ProgressBar