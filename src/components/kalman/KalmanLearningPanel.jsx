import { useState } from "react";
import { StateSpaceModule } from "./modules/StateSpaceModule";
import { InitialConditionsModule } from "./modules/InitialConditionsModule";
import { GainInspectorModule } from "./modules/GainInspectorModule";
import { ConvergenceRaceModule } from "./modules/ConvergenceRaceModule";
import { ArrhythmiaModule } from "./modules/ArrhythmiaModule";
import styles from "./kalman.module.css";

const TABS = [
  { id: "stateSpace", label: "State Space" },
  { id: "initial", label: "Initial Conditions ★" },
  { id: "gain", label: "Gain Inspector" },
  { id: "race", label: "Convergence Race" },
  { id: "arrhythmia", label: "Arrhythmia Challenge" },
];

export function KalmanLearningPanel() {
  const [activeTab, setActiveTab] = useState("initial");

  return (
    <section className={styles.kalmanPanel}>
      <h2>Kalman Filter Learning Modules</h2>
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

      <div role="tabpanel">
        {activeTab === "stateSpace" && <StateSpaceModule />}
        {activeTab === "initial" && <InitialConditionsModule />}
        {activeTab === "gain" && <GainInspectorModule />}
        {activeTab === "race" && <ConvergenceRaceModule />}
        {activeTab === "arrhythmia" && <ArrhythmiaModule />}
      </div>
    </section>
  );
}
