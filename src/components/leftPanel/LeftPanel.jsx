import { useContext } from "react";
import styles from "./leftPanel.module.css";
import { EcgUnfilter } from "../graph/EcgUnfilter.jsx";
import { EcgNoisy } from "../graph/EcgNoisy.jsx";
import { SimulationContext } from "../../context/SimulationContext.jsx";
import { EcgUnfilteredPSD } from "../graph/EcgUnfilteredPSD.jsx";
import { KalmanLearningPanel } from "../kalman/KalmanLearningPanel.jsx";

export const LeftPanel = () => {
  const { generateECG, applyNoiseTrigger, applypsdTrigger } =
    useContext(SimulationContext);

  return (
    <div className={styles.leftPanelContainer}>
      <div className={styles.container}>
        <div className={styles.ecgChartsBlock}>
          {applypsdTrigger && (
            <div className={styles.psdContainer}>
              <EcgUnfilteredPSD />
            </div>
          )}
          {generateECG && <EcgUnfilter />}
          {applyNoiseTrigger && <EcgNoisy />}
        </div>
        {generateECG && <KalmanLearningPanel />}
      </div>
    </div>
  );
};
