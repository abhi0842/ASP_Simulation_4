import { useContext } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import {
  p0ConfidenceLabel,
  x0ColorIndicator,
} from "../../utils/kalman";
import { alphaToSlider, sliderToAlpha } from "../../utils/kalmanSliderUtils";
import styles from "./kalman.module.css";

export function KalmanSliders({
  trueFirstSample = 0,
  showX0 = true,
  showP0 = true,
  showQ = true,
  showR = true,
  onScenario,
  scenarioCard = null,
}) {
  const { kalmanParams, setKalmanParams, setLastKalmanSlider } =
    useContext(SimulationContext);
  const { x0hat, P0_alpha, Q_diag, R } = kalmanParams;

  const update = (patch) => setKalmanParams((p) => ({ ...p, ...patch }));

  return (
    <div className={styles.controlsCol}>
      {showX0 && (
        <label
          className={styles.sliderLabel}
          title="Your initial guess of the ECG amplitude before seeing any data"
        >
          <span>
            Initial state estimate x̂₀
            <span className={styles.valueBadge}>{x0hat.toFixed(2)} mV</span>
            <span
              className={styles.colorDot}
              style={{ background: x0ColorIndicator(x0hat, trueFirstSample) }}
            />
          </span>
          <input
            type="range"
            min="-1.5"
            max="1.5"
            step="0.01"
            value={x0hat}
            onChange={(e) => update({ x0hat: Number(e.target.value) })}
          />
        </label>
      )}

      {showP0 && (
        <label
          className={styles.sliderLabel}
          title="How certain are you about your initial guess?"
        >
          <span>
            Initial uncertainty P₀ = αI
            <span className={styles.valueBadge}>{P0_alpha.toFixed(4)}</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={alphaToSlider(P0_alpha)}
            onChange={(e) =>
              update({ P0_alpha: sliderToAlpha(e.target.value) })
            }
          />
          <p className={styles.hintText}>{p0ConfidenceLabel(P0_alpha)}</p>
        </label>
      )}

      {showQ && (
        <label
          className={styles.sliderLabel}
          title="How much does the true signal change unpredictably each step?"
        >
          <span>
            Process noise Q (diagonal)
            <span className={styles.valueBadge}>{Q_diag.toFixed(4)}</span>
          </span>
          <input
            type="range"
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
      )}

      {showR && (
        <label
          className={styles.sliderLabel}
          title="How noisy is the sensor? Matches the noise added to the signal."
        >
          <span>
            Measurement noise R
            <span className={styles.valueBadge}>{R.toFixed(4)}</span>
          </span>
          <input
            type="range"
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
      )}

      {onScenario && (
        <div className={styles.scenarioGrid}>
          <button type="button" onClick={() => onScenario("A")}>
            ✓ Accurate + Confident
          </button>
          <button type="button" onClick={() => onScenario("B")}>
            ✗ Wrong + Confident
          </button>
          <button type="button" onClick={() => onScenario("C")}>
            ✗ Wrong + Uncertain
          </button>
          <button type="button" onClick={() => onScenario("D")}>
            ∞ Diffuse Prior
          </button>
        </div>
      )}
      {scenarioCard}
    </div>
  );
}
