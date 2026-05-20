import { useContext, useMemo, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";

const CARDS = [
  {
    id: "connect",
    title: "Patient just connected",
    subtitle: "No prior reading. ECG amplitude unknown.",
    explanation:
      "With no prior knowledge, admitting high uncertainty (large P₀) forces the filter to trust early measurements immediately. A wrong confident guess here could corrupt the first 3–5 seconds of recording.",
    recommendation: "x̂₀ = 0 mV, P₀ = 75",
    apply: { x0hat: 0, P0_alpha: 75 },
  },
  {
    id: "routine",
    title: "Known patient, routine check",
    subtitle: "Previous session data available. Good prior exists.",
    explanation:
      "When you know the patient's typical amplitude from a previous session, a confident prior (small P₀) gives a smoother startup with no initial transient.",
    recommendation: "x̂₀ = last known value, P₀ = 0.05",
    useTrueFirst: true,
    apply: { P0_alpha: 0.05 },
  },
  {
    id: "critical",
    title: "Critical care, arrhythmia risk",
    subtitle: "First seconds are diagnostically critical.",
    explanation:
      "A wrong x̂₀ combined with small P₀ suppresses Kalman gain in the early window. If an arrhythmia event occurs in this window, the filter may smooth it away. Always use large P₀ in critical care regardless of how confident you are.",
    recommendation: "x̂₀ = 0 mV, P₀ = 100",
    apply: { x0hat: 0, P0_alpha: 100 },
  },
];

export function ClinicalContextPanel() {
  const [expanded, setExpanded] = useState(false);
  const { setKalmanParams, cleanSignal, rawSamples } = useContext(SimulationContext);

  const trueFirstSample = useMemo(() => {
    if (cleanSignal.length) return cleanSignal[0];
    if (rawSamples.length) return rawSamples[0].y;
    return 0;
  }, [cleanSignal, rawSamples]);

  const handleApply = (card) => {
    const patch = { ...card.apply };
    if (card.useTrueFirst) {
      patch.x0hat = trueFirstSample;
    }
    setKalmanParams((p) => ({ ...p, ...patch }));
  };

  return (
    <div className={styles.clinicalRoot}>
      <button
        type="button"
        className={styles.clinicalToggle}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        Clinical Context
        <span>{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className={styles.clinicalCards}>
          {CARDS.map((card) => (
            <div key={card.id} className={styles.clinicalCard}>
              <h4>{card.title}</h4>
              <p className={styles.clinicalSubtitle}>{card.subtitle}</p>
              <p className={styles.clinicalText}>{card.explanation}</p>
              <div className={styles.clinicalRec}>{card.recommendation}</div>
              <button
                type="button"
                className={styles.clinicalApply}
                onClick={() => handleApply(card)}
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
