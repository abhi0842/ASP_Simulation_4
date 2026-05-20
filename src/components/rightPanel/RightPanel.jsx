import { useContext, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";
import Swal from "sweetalert2";
import { KalmanControls } from "./KalmanControls.jsx";
import { ClinicalContextPanel } from "./ClinicalContextPanel.jsx";

export const RightPanel = () => {
  const {
    time,
    setTime,
    originalFs,
    setGenerateECG,
    setApplyNoiseTrigger,
    noise,
    setNoise,
    csvFilePath,
    prevPathRef,
    setCsvFilePath,
    generateECG,
    applyNoiseTrigger,
    setApplypsdTrigger,
  } = useContext(SimulationContext);

  const runPsd = () => {
    if (!generateECG) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please generate ECG signal first!",
      });
      return;
    }
    if (!applyNoiseTrigger) {
      Swal.fire({
        icon: "info",
        title: "Add noise first",
        text: "Apply noise to the signal before computing PSD.",
      });
      return;
    }
    setApplypsdTrigger(true);
  };

  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : base + "/";
  const assetPath = (name) => normalizedBase + name;

  const noiseTrigger = () => {
    if (!generateECG) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please generate ECG signal first!",
      });
      return;
    }
    if (!noise.baseline && !noise.powerline && !noise.emg) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please select at least one noise type!",
      });
      return;
    }
    setApplyNoiseTrigger(true);
  };

  useEffect(() => {
    if (prevPathRef.current !== csvFilePath) {
      setApplyNoiseTrigger(false);
      setApplypsdTrigger(false);
      prevPathRef.current = csvFilePath;
    }
  }, [csvFilePath, prevPathRef, setApplyNoiseTrigger, setApplypsdTrigger]);

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        <h2>ECG & Kalman Controls</h2>

        <div className={styles.box}>
          <h3>Signal Setup</h3>
          <label>Select ECG Dataset</label>
          <select
            value={csvFilePath}
            onChange={(e) => setCsvFilePath(e.target.value)}
          >
            <option value={assetPath("ecg200.csv")}>ECG Dataset 1</option>
            <option value={assetPath("ecg300.csv")}>ECG Dataset 2</option>
            <option value={assetPath("ecg100.csv")}>ECG Dataset 3</option>
          </select>

          <label>
            Duration (seconds)
            <p className={styles.rangeValue}>
              : <span>{time} seconds</span>
            </p>
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={time}
            onChange={(e) => setTime(Number(e.target.value))}
          />

          <label>
            Sampling Rate : <span>{originalFs} Hz</span>
          </label>

          <button type="button" onClick={() => setGenerateECG(true)}>
            Generate ECG Signal
          </button>
        </div>

        <div className={styles.box}>
          <h3>Add Noise</h3>

          <label>
            <input
              type="checkbox"
              checked={noise.baseline}
              onChange={(e) =>
                setNoise({ ...noise, baseline: e.target.checked })
              }
            />
            Baseline Wander
          </label>

          <label>
            <input
              type="checkbox"
              checked={noise.powerline}
              onChange={(e) =>
                setNoise({ ...noise, powerline: e.target.checked })
              }
            />
            Powerline (50 Hz)
          </label>

          <label>
            <input
              type="checkbox"
              checked={noise.emg}
              onChange={(e) => setNoise({ ...noise, emg: e.target.checked })}
            />
            EMG Noise
          </label>
          <div className={styles.buttonContainer}>
            <button type="button" onClick={noiseTrigger}>
              Add Noise to Signal
            </button>
          </div>
        </div>

        <KalmanControls />

        {generateECG && <ClinicalContextPanel />}

        <div className={styles.box}>
          <h3>PSD Analysis</h3>
          <p className={styles.kalmanHint}>
            Power spectral density of the noisy ECG (after adding noise).
          </p>
          <button type="button" onClick={runPsd}>
            Compute PSD
          </button>
        </div>
      </div>
    </div>
  );
};
