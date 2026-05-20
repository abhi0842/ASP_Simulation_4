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
            <b>Duration</b>, and click <b>Generate ECG Signal</b>. The clean
            signal that appears is your ground truth — what the Kalman filter
            is trying to recover.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 2: </span>Select noise types (start with{" "}
            <b>Baseline Wander</b> and <b>60 Hz Powerline</b>) and click{" "}
            <b>Add Noise to Signal</b>. Notice <b>R</b> auto-adjusts in the
            right panel to reflect the noise level you added.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 3: </span>In the right panel, try the scenario presets
            in this order — <b>B first, then C, then A</b>. Watch the{" "}
            <b>Initial Conditions</b> tab after each click and compare{" "}
            <b>Early RMSE</b> and <b>Transient Length</b>. This order reveals
            the core insight: wrong + uncertain (C) outperforms wrong +
            confident (B) despite identical x̂₀. Then tune the sliders
            (x̂₀, P₀, Q, R) manually and watch the charts update live.
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 4: </span>Explore the tabs:
            <ul>
              <li>
                <b>Initial Conditions</b> — signal comparison, uncertainty
                evolution, and sensitivity chart
              </li>
              <li>
                <b>Comparison</b> — all four scenarios overlaid with a metrics
                table (green = best, red = worst)
              </li>
              <li>
                <b>Convergence Race</b> — animated proof that large P₀
                converges faster than small P₀
              </li>
              <li>
                <b>Gain Inspector</b> — Kalman gain K_k at every step; click
                any bar to see the exact K = P/(P+R) calculation for that step
              </li>
              <li>
                <b>Common Mistakes</b> — four problems with Demonstrate
                buttons; Mistake 3 has no button because it is a Q/R problem,
                not a P₀ problem
              </li>
              <li>
                <b>State Space</b> — state vector [amplitude, slope] and
                F-matrix one-step prediction at any time point
              </li>
              <li>
                <b>Arrhythmia Challenge</b> — tachycardia detection with
                expert parameter comparisons
              </li>
            </ul>
          </p>
        </div>

        <div className={styles.card}>
          <p>
            <span>STEP 5 (Optional): </span>Click <b>Compute PSD</b> after
            adding noise to view the power spectrum and see how noise types
            occupy different frequency bands.
          </p>
        </div>
      </div>
    </div>
  );
};