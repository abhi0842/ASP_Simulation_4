import { useContext, useMemo, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { useKalmanSignals } from "../../hooks/useKalmanSignals";
import { StateSpacePanel } from "./panels/StateSpacePanel";
import { InitialConditionsPanel } from "./panels/InitialConditionsPanel";
import { GainInspectorPanel } from "./panels/GainInspectorPanel";
import { ConvergenceRacePanel } from "./panels/ConvergenceRacePanel";
import { ArrhythmiaPanel } from "./panels/ArrhythmiaPanel";
import { ComparisonPanel } from "./panels/ComparisonPanel";
import { CommonMistakesPanel } from "./panels/CommonMistakesPanel";
import styles from "./kalman.module.css";

const TABS = [
  { id: "stateSpace", label: "State Space" },
  { id: "initialConditions", label: "Initial Conditions ★" },
  { id: "comparison", label: "Comparison" },
  { id: "commonMistakes", label: "Common Mistakes" },
  { id: "gainInspector", label: "Gain Inspector" },
  { id: "convergenceRace", label: "Convergence Race" },
  { id: "arrhythmia", label: "Arrhythmia Challenge" },
];

export function KalmanLearningPanel() {
  const [activeTab, setActiveTab] = useState("initialConditions");
  const { generateECG, cleanSignal: rawCleanSignal } = useContext(SimulationContext);
  const { aligned, dt } = useKalmanSignals();

  const panelProps = useMemo(
    () => ({
      cleanSignal: aligned.truth,
      noisySignal: aligned.measurements,
      times: aligned.times,
      dt,
    }),
    [aligned.truth, aligned.measurements, aligned.times, dt]
  );

  if (!generateECG) return null;

  return (
    <section className={styles.kalmanTabsRoot} aria-label="Kalman learning modules">
      <nav className={styles.tabBar} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id ? styles.tabBtnActive : styles.tabBtn
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabContent} role="tabpanel">
        {activeTab === "stateSpace" && <StateSpacePanel {...panelProps} />}
        {activeTab === "initialConditions" && (
          <InitialConditionsPanel {...panelProps} />
        )}
        {activeTab === "comparison" && <ComparisonPanel {...panelProps} />}
        {activeTab === "commonMistakes" && (
          <CommonMistakesPanel onNavigateTab={setActiveTab} />
        )}
        {activeTab === "gainInspector" && <GainInspectorPanel {...panelProps} />}
        {activeTab === "convergenceRace" && (
          <ConvergenceRacePanel {...panelProps} />
        )}
        {activeTab === "arrhythmia" && (
          <ArrhythmiaPanel cleanSignal={rawCleanSignal} dt={panelProps.dt} />
        )}
      </div>
    </section>
  );
}
