import { useContext, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { SimulationContext } from "../../../context/SimulationContext";
import { useKalmanSignals } from "../../../hooks/useKalmanSignals";
import { fmt4, kalmanGainScalar } from "../../../utils/kalman";
import { TheoryModal } from "../TheoryModal";
import { registerKalmanCharts, COLORS, baseChartOptions } from "../kalmanChartSetup";
import styles from "../kalman.module.css";

registerKalmanCharts();

export function GainInspectorModule() {
  const {
    generateECG,
    kalmanParams,
    setKalmanParams,
    lastKalmanSlider,
    setLastKalmanSlider,
  } = useContext(SimulationContext);
  const { aligned, filterResult } = useKalmanSignals();
  const [selectedStep, setSelectedStep] = useState(0);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  const { Q_diag, R } = kalmanParams;
  const nShow = 100;

  const barChart = useMemo(() => {
    if (!filterResult) return null;
    const K = filterResult.K_trace.slice(0, nShow);
    const labels = K.map((_, i) => String(i));
    const maxK = Math.max(...K, 0.001);

    return {
      data: {
        labels,
        datasets: [
          {
            label: "K_k",
            data: K,
            backgroundColor: K.map((v) => {
              const t = v / maxK;
              return `rgba(${Math.round(80 - t * 40)}, ${Math.round(119 - t * 30)}, 221, ${0.5 + t * 0.5})`;
            }),
          },
        ],
      },
      options: {
        ...baseChartOptions,
        animation: { duration: 500 },
        onClick: (_, elements) => {
          if (elements?.[0]) setSelectedStep(elements[0].index);
        },
        plugins: {
          title: {
            display: true,
            text: "Kalman gain K_k (first 100 steps)",
          },
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: "Step k" } },
          y: { title: { display: true, text: "K_k" }, min: 0 },
        },
      },
    };
  }, [filterResult]);

  const stepDetail = useMemo(() => {
    if (!filterResult || !aligned.hasData) return "";
    const k = Math.min(selectedStep, filterResult.K_trace.length - 1);
    const P_pred = filterResult.P_pred_trace[k] ?? 0;
    const K = filterResult.K_trace[k] ?? 0;
    const innov = filterResult.innovations[k] ?? 0;
    const correction = K * innov;
    const Kcalc = kalmanGainScalar(P_pred, R);

    return `Step k = ${k}
─────────────────────────────
P_pred  = ${fmt4(P_pred)} (scalar P_pred[0,0])
H       = [1, 0]
R       = ${fmt4(R)}

K_k = P_pred × Hᵀ × (H × P_pred × Hᵀ + R)⁻¹
    = ${fmt4(P_pred)} × 1 × (${fmt4(P_pred)} × 1 + ${fmt4(R)})⁻¹
    = ${fmt4(P_pred)} / (${fmt4(P_pred)} + ${fmt4(R)})
    = ${fmt4(Kcalc)}

Innovation (z_k - H×x̂_pred) = ${fmt4(innov)}
State correction = K × innovation = ${fmt4(correction)}`;
  }, [filterResult, aligned, selectedStep, R]);

  if (!generateECG) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to inspect Kalman gain.
      </p>
    );
  }

  return (
    <>
      <div className={styles.moduleHeader}>
        <h3>Kalman Gain Inspector</h3>
        <button
          type="button"
          className={styles.theoryBtn}
          onClick={() => setTheoryOpen(true)}
        >
          Theory Link
        </button>
      </div>

      <label
        className={styles.sliderLabel}
        title="How noisy is the sensor?"
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
            setKalmanParams((p) => ({ ...p, R: Number(e.target.value) }));
            setChartKey((k) => k + 1);
          }}
        />
      </label>

      <label
        className={styles.sliderLabel}
        title="Process noise — how much the true signal changes each step"
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
            setKalmanParams((p) => ({
              ...p,
              Q_diag: Number(e.target.value),
            }));
            setChartKey((k) => k + 1);
          }}
        />
      </label>

      {barChart && (
        <section className={styles.chartBox}>
          <Bar
            key={chartKey}
            data={barChart.data}
            options={barChart.options}
          />
        </section>
      )}

      <p className={styles.sensitivityText}>
        {lastKalmanSlider === "R" ? (
          <span className={styles.highlight}>Increasing R</span>
        ) : (
          <span>Increasing R</span>
        )}{" "}
        → K decreases → filter trusts measurements less
        <br />
        {lastKalmanSlider === "Q" ? (
          <span className={styles.highlight}>Increasing Q</span>
        ) : (
          <span>Increasing Q</span>
        )}{" "}
        → K increases → filter trusts measurements more
      </p>

      <div className={styles.stepDetail}>{stepDetail}</div>

      {theoryOpen && (
        <TheoryModal
          theoryKey="gainInspector"
          onClose={() => setTheoryOpen(false)}
        />
      )}
    </>
  );
}
