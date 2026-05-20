import { useMemo, useState } from "react";
import { kalmanGainScalar } from "../../utils/kalman";
import { ChartCanvas } from "./ChartCanvas";
import { COLORS } from "./kalmanColors";
import styles from "./kalman.module.css";

function scalarCost(K, P, R) {
  return (1 - K) ** 2 * P + K ** 2 * R;
}

export function KDerivationPanel({ P0_alpha, R }) {
  const [expanded, setExpanded] = useState(false);
  const [kSlider, setKSlider] = useState(() => kalmanGainScalar(P0_alpha, R));

  const optimalK = useMemo(
    () => kalmanGainScalar(P0_alpha, R),
    [P0_alpha, R]
  );

  const costAtK = useMemo(
    () => scalarCost(kSlider, P0_alpha, R),
    [kSlider, P0_alpha, R]
  );

  const costChartDeps = [P0_alpha, R, kSlider, costAtK, optimalK];

  const buildCostChart = () => {
    const points = [];
    for (let k = 0; k <= 1.001; k += 0.02) {
      points.push({ x: k, y: scalarCost(k, P0_alpha, R) });
    }
    return {
      type: "line",
      data: {
        datasets: [
          {
            label: "Cost(K)",
            data: points,
            borderColor: COLORS.teal,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
          },
          {
            label: "Current K",
            data: [{ x: kSlider, y: costAtK }],
            borderColor: COLORS.coral,
            backgroundColor: COLORS.coral,
            pointRadius: 6,
            showLine: false,
          },
          {
            label: "Optimal K",
            data: [
              {
                x: optimalK,
                y: scalarCost(optimalK, P0_alpha, R),
              },
            ],
            borderColor: COLORS.green,
            backgroundColor: COLORS.green,
            pointRadius: 6,
            showLine: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: 1,
            title: { display: true, text: "K" },
          },
          y: {
            title: { display: true, text: "Cost" },
          },
        },
      },
    };
  };

  return (
    <div className={styles.derivationRoot}>
      <button
        type="button"
        className={styles.derivationToggle}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span>How is K derived?</span>
        <span className={styles.derivationChevron}>{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className={styles.derivationSteps}>
          <div className={styles.derivationCard}>
            <p className={styles.derivationStepNum}>Step 1</p>
            <h4 className={styles.derivationTitle}>What are we minimizing?</h4>
            <p className={styles.mathBlock}>
              Cost(K) = E[(x<sub>true</sub> − (x<sub>pred</sub> + K(z − Hx
              <sub>pred</sub>)))²]
            </p>
            <label className={styles.sliderLabel}>
              <span>
                Explore K: <strong>{kSlider.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={kSlider}
                onChange={(e) => setKSlider(Number(e.target.value))}
              />
            </label>
            <p className={styles.costValue}>
              Cost at K = {kSlider.toFixed(2)}:{" "}
              <strong>{costAtK.toFixed(6)}</strong>
            </p>
            <p className={styles.hintText}>
              Cost is minimized at K = P/(P+R) ={" "}
              <strong>{optimalK.toFixed(4)}</strong>
            </p>
            <ChartCanvas
              buildConfig={buildCostChart}
              deps={costChartDeps}
              className={styles.chartBoxMini}
            />
          </div>

          <div className={styles.derivationCard}>
            <p className={styles.derivationStepNum}>Step 2</p>
            <h4 className={styles.derivationTitle}>Setting dCost/dK = 0</h4>
            <p className={styles.mathBlock}>
              dCost/dK = −2PH<sup>T</sup> + 2(HPH<sup>T</sup> + R)K = 0
            </p>
            <p className={styles.mathBlock}>
              K = PH<sup>T</sup>(HPH<sup>T</sup> + R)<sup>−1</sup>
            </p>
            <p className={styles.mathBlock}>Scalar case: K = P / (P + R)</p>
          </div>

          <div className={styles.derivationCard}>
            <p className={styles.derivationStepNum}>Step 3</p>
            <h4 className={styles.derivationTitle}>
              This is the K your filter is using right now
            </h4>
            <div className={styles.liveKBox}>
              <p>Current P₀ = {P0_alpha.toFixed(4)}</p>
              <p>Current R = {R.toFixed(4)}</p>
              <p>
                K₁ = P₀ / (P₀ + R) = <strong>{optimalK.toFixed(4)}</strong>
              </p>
            </div>
            <p className={styles.hintText}>
              Larger P₀ → K₁ closer to 1 → trust measurements more
            </p>
            <p className={styles.hintText}>
              Smaller P₀ → K₁ closer to 0 → trust prior more
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
