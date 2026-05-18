import { useContext, useEffect, useMemo, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import {
  p0ConfidenceLabel,
  x0ColorIndicator,
} from "../../utils/kalman";
import { alphaToSlider, sliderToAlpha } from "../../utils/kalmanSliderUtils";
import {
  getScenarioPreset,
  SCENARIO_MESSAGES,
  estimateRFromNoise,
} from "../../utils/kalmanScenarios";
import styles from "./rightPanel.module.css";

const FS_OPTIONS = [100, 250, 500];

export function KalmanControls() {
  const {
    generateECG,
    applyNoiseTrigger,
    noise,
    cleanSignal,
    rawSamples,
    kalmanParams,
    setKalmanParams,
    setLastKalmanSlider,
  } = useContext(SimulationContext);

  const [activeScenario, setActiveScenario] = useState(null);
  const { x0hat, P0_alpha, Q_diag, R, fsKalman } = kalmanParams;

  const trueFirstSample = useMemo(() => {
    if (cleanSignal.length) return cleanSignal[0];
    if (rawSamples.length) return rawSamples[0].y;
    return 0;
  }, [cleanSignal, rawSamples]);

  const update = (patch) => setKalmanParams((p) => ({ ...p, ...patch }));

  useEffect(() => {
    if (!applyNoiseTrigger) return;
    const estimated = estimateRFromNoise(noise);
    setKalmanParams((p) => ({ ...p, R: estimated }));
  }, [applyNoiseTrigger, noise, setKalmanParams]);

  const applyScenario = (key) => {
    const preset = getScenarioPreset(key, trueFirstSample);
    if (!preset) return;
    setKalmanParams((p) => ({ ...p, ...preset }));
    setActiveScenario(key);
  };

  if (!generateECG) {
    return (
      <div className={styles.box}>
        <h3>Kalman Filter</h3>
        <p className={styles.kalmanHint}>
          Generate an ECG signal first, then tune Kalman parameters here. Charts
          update in the learning modules below the signal plots.
        </p>
      </div>
    );
  }

  const scenarioMsg = activeScenario ? SCENARIO_MESSAGES[activeScenario] : null;

  return (
    <div className={styles.box}>
      <h3>Kalman Filter</h3>
      <p className={styles.kalmanHint}>
        Shared with all Kalman learning tabs.{" "}
        {applyNoiseTrigger
          ? "R auto-adjusts when noise is applied."
          : "Add noise to enable measurement sync."}
      </p>

      <label
        className={styles.sliderBlock}
        title="Your initial guess of the ECG amplitude before seeing any data"
      >
        <span className={styles.sliderHeader}>
          Initial state x̂₀
          <span className={styles.valueBadge}>{x0hat.toFixed(2)} mV</span>
          <span
            className={styles.colorDot}
            style={{ background: x0ColorIndicator(x0hat, trueFirstSample) }}
          />
        </span>
        <input
          type="range"
          className={styles.rangeSlider}
          min="-1.5"
          max="1.5"
          step="0.01"
          value={x0hat}
          onChange={(e) => update({ x0hat: Number(e.target.value) })}
        />
      </label>

      <label
        className={styles.sliderBlock}
        title="How certain are you about your initial guess?"
      >
        <span className={styles.sliderHeader}>
          Initial uncertainty P₀ = αI
          <span className={styles.valueBadge}>{P0_alpha.toFixed(4)}</span>
        </span>
        <input
          type="range"
          className={styles.rangeSlider}
          min="0"
          max="100"
          step="0.1"
          value={alphaToSlider(P0_alpha)}
          onChange={(e) =>
            update({ P0_alpha: sliderToAlpha(e.target.value) })
          }
        />
        <span className={styles.sliderSubtext}>{p0ConfidenceLabel(P0_alpha)}</span>
      </label>

      <label
        className={styles.sliderBlock}
        title="How much does the true signal change unpredictably each step?"
      >
        <span className={styles.sliderHeader}>
          Process noise Q
          <span className={styles.valueBadge}>{Q_diag.toFixed(4)}</span>
        </span>
        <input
          type="range"
          className={styles.rangeSlider}
          min="0.0001"
          max="0.1"
          step="0.0001"
          value={Q_diag}
          onChange={(e) => {
            setLastKalmanSlider("Q");
            update({ Q_diag: Number(e.target.value) });
          }}
        />
      </label>

      <label
        className={styles.sliderBlock}
        title="How noisy is the sensor? Synced estimate when noise is applied."
      >
        <span className={styles.sliderHeader}>
          Measurement noise R
          <span className={styles.valueBadge}>{R.toFixed(4)}</span>
        </span>
        <input
          type="range"
          className={styles.rangeSlider}
          min="0.001"
          max="1"
          step="0.001"
          value={R}
          onChange={(e) => {
            setLastKalmanSlider("R");
            update({ R: Number(e.target.value) });
          }}
        />
      </label>

      <label className={styles.sliderBlock}>
        <span className={styles.sliderHeader}>F-matrix sampling rate</span>
        <select
          value={fsKalman}
          onChange={(e) => update({ fsKalman: Number(e.target.value) })}
        >
          {FS_OPTIONS.map((hz) => (
            <option key={hz} value={hz}>
              {hz} Hz (dt = {(1 / hz).toFixed(4)} s)
            </option>
          ))}
        </select>
      </label>

      <p className={styles.scenarioTitle}>Initial-condition presets</p>
      <div className={styles.scenarioGrid}>
        <button type="button" onClick={() => applyScenario("A")}>
          ✓ Accurate + Confident
        </button>
        <button type="button" onClick={() => applyScenario("B")}>
          ✗ Wrong + Confident
        </button>
        <button type="button" onClick={() => applyScenario("C")}>
          ✗ Wrong + Uncertain
        </button>
        <button type="button" onClick={() => applyScenario("D")}>
          ∞ Diffuse Prior
        </button>
      </div>

      {scenarioMsg && (
        <p
          className={`${styles.scenarioNote} ${styles[`scenario_${scenarioMsg.tone}`]}`}
        >
          {scenarioMsg.text}
        </p>
      )}
    </div>
  );
}
