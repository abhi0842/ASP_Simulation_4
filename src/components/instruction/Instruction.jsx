import styles from "./instruction.module.css";

export const Instruction = () => {
  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>INSTRUCTIONS</h1>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 1: </span>Select an <b>ECG Dataset</b>, set{" "}
            <b>Duration</b>, and click <b>Generate ECG Signal</b>.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 2: </span>Select noise types and click{" "}
            <b>Add Noise to Signal</b>. View the noisy trace in the main chart.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 3: </span>In the right panel, tune Kalman parameters
            (x̂₀, P₀, Q, R) and try scenario presets. Charts in the{" "}
            <b>Initial Conditions</b> tab update live.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 4: </span>Explore other tabs:
            <ul>
              <li>
                <b>State Space</b> — state vector and F-matrix predict step
              </li>
              <li>
                <b>Gain Inspector</b> — Kalman gain K_k over time
              </li>
              <li>
                <b>Convergence Race</b> — how P₀ affects transient convergence
              </li>
              <li>
                <b>Arrhythmia Challenge</b> — tachycardia tracking with expert
                comparisons
              </li>
            </ul>
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 5 (Optional): </span>Click <b>Compute PSD</b> after adding
            noise to view the power spectrum of the noisy signal.
          </p>
        </div>
      </div>
    </div>
  );
};
