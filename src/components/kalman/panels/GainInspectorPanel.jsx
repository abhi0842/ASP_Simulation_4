import { useContext, useMemo, useState, useCallback } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import { useKalmanSignals } from "../../../hooks/useKalmanSignals";
import { fmt4, kalmanGainScalar } from "../../../utils/kalman";
import { useChartJs } from "../../../hooks/useChartJs";
import { PanelHeader } from "../PanelHeader";
import { COLORS } from "../kalmanColors";
import styles from "../kalman.module.css";

const N_SHOW = 100;

export function GainInspectorPanel(props) {
  void props;
  const { kalmanParams, lastKalmanSlider } = useContext(SimulationContext);
  const { aligned, filterResult } = useKalmanSignals();
  const [selectedStep, setSelectedStep] = useState(0);
  const { R } = kalmanParams;

  const buildBarChart = useCallback(() => {
    if (!filterResult) return null;
    const K = filterResult.K_trace.slice(0, N_SHOW);
    const labels = K.map((_, i) => String(i));
    const maxK = Math.max(...K, 0.001);

    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "K_k",
            data: K,
            backgroundColor: K.map((v) => {
              const t = v / maxK;
              return `rgba(127,119,221,${0.5 + t * 0.5})`;
            }),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        onClick: (_e, elements) => {
          if (elements?.[0]) setSelectedStep(elements[0].index);
        },
        plugins: {
          title: { display: true, text: "Kalman gain K_k (first 100 steps)" },
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: "Step k" } },
          y: { title: { display: true, text: "K_k" }, min: 0 },
        },
      },
    };
  }, [filterResult]);

  const barDeps = [filterResult?.K_trace, kalmanParams.Q_diag, kalmanParams.R];
  const { canvasRef } = useChartJs(buildBarChart, barDeps);

  const stepDetail = useMemo(() => {
    if (!filterResult || !aligned.hasData) return "";
    const k = Math.min(selectedStep, filterResult.K_trace.length - 1);
    const P_pred = filterResult.P_pred_trace[k] ?? 0;
    const K = filterResult.K_trace[k] ?? 0;
    const innov = filterResult.innovations[k] ?? 0;
    const Kcalc = kalmanGainScalar(P_pred, R);

    return `Step k = ${k}
─────────────────────────────
P_pred  = ${fmt4(P_pred)} (scalar P_pred[0,0])
H       = [1, 0]
R       = ${fmt4(R)}

K_k = P_pred × Hᵀ × (H × P_pred × Hᵀ + R)⁻¹
    = ${fmt4(P_pred)} / (${fmt4(P_pred)} + ${fmt4(R)})
    = ${fmt4(Kcalc)}

Innovation (z_k - H×x̂_pred) = ${fmt4(innov)}
State correction = K × innovation = ${fmt4(K * innov)}`;
  }, [filterResult, aligned.hasData, selectedStep, R]);

  if (!aligned.hasData) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to inspect Kalman gain.
      </p>
    );
  }

  return (
    <div className={styles.panelRoot}>
      <PanelHeader title="Kalman Gain Inspector" />

      <p className={styles.hintText}>
        Adjust R and Q in the right-panel Kalman section. Click a bar for step
        details.
      </p>

      <div className={styles.chartBox}>
        <canvas ref={canvasRef} />
      </div>

      <p className={styles.sensitivityText}>
        {lastKalmanSlider === "R" ? (
          <strong>Increasing R</strong>
        ) : (
          "Increasing R"
        )}{" "}
        → K decreases → filter trusts measurements less
        <br />
        {lastKalmanSlider === "Q" ? (
          <strong>Increasing Q</strong>
        ) : (
          "Increasing Q"
        )}{" "}
        → K increases → filter trusts measurements more
      </p>

      <pre className={styles.stepDetail}>{stepDetail}</pre>
    </div>
  );
}
