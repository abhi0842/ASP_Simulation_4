import { useContext, useState } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import styles from "../kalman.module.css";

const MISTAKES = [
  {
    id: "ignore",
    title: "Filter ignores early measurements",
    cause: "P₀ too small with wrong x̂₀",
    symptom: "Filtered line stays near x̂₀ for first 50–100 steps",
    fix: "Increase P₀ to 10–100",
    tab: "initialConditions",
    apply: { P0_alpha: 0.001, x0hat: -1.2 },
  },
  {
    id: "noisy",
    title: "Filter too noisy at startup",
    cause: "P₀ too large when good prior is available",
    symptom: "First 5–10 estimates are erratic, spike with noise",
    fix: "Reduce P₀ if x̂₀ is reliable",
    tab: "initialConditions",
    apply: { P0_alpha: 1000, x0hat: 0 },
  },
  {
    id: "slow",
    title: "Slow convergence throughout, not just startup",
    cause: "This is NOT a P₀ problem. Q too small or R miscalibrated.",
    symptom: "Late RMSE is also high, same as Early RMSE",
    fix: "Tune Q and R, not P₀",
    teaching:
      "If Late RMSE ≈ Early RMSE, initial conditions are not your problem. Check Q and R.",
    tab: "initialConditions",
    apply: { Q_diag: 0.0001 },
  },
  {
    id: "diverge",
    title: "Filter oscillates or diverges",
    cause: "Q set too high, model expects too much unpredictability",
    symptom: "P_k grows instead of converging, K_k stays near 1",
    fix: "Reduce Q significantly",
    tab: "initialConditions",
    apply: { Q_diag: 0.5 },
  },
];

export function CommonMistakesPanel({ onNavigateTab }) {
  const { setKalmanParams } = useContext(SimulationContext);
  const [openId, setOpenId] = useState(null);

  const demonstrate = (mistake) => {
    setKalmanParams((p) => ({ ...p, ...mistake.apply }));
    onNavigateTab?.(mistake.tab);
  };

  return (
    <div className={styles.panelRoot}>
      <h3 className={styles.panelTitle}>Common Mistakes</h3>
      <p className={styles.hintText}>
        Expand a mistake, then click Demonstrate to load parameters in the right
        panel and Initial Conditions tab.
      </p>

      <div className={styles.accordionList}>
        {MISTAKES.map((m) => {
          const isOpen = openId === m.id;
          return (
            <div key={m.id} className={styles.accordionItem}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => setOpenId(isOpen ? null : m.id)}
                aria-expanded={isOpen}
              >
                <span>{m.title}</span>
                <span>{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen && (
                <div className={styles.accordionBody}>
                  <p>
                    <strong>Cause:</strong> {m.cause}
                  </p>
                  <p>
                    <strong>Visible symptom:</strong> {m.symptom}
                  </p>
                  <p>
                    <strong>Fix:</strong> {m.fix}
                  </p>
                  {m.teaching && (
                    <p className={styles.insightCard}>{m.teaching}</p>
                  )}
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => demonstrate(m)}
                  >
                    Demonstrate
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
