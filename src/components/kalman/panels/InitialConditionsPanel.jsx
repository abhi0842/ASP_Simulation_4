import { useContext, useMemo } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import {
  runKalmanFilter,
  solvePInfinity,
  computeRMSE,
  computeTransientLength,
  convergenceBadge,
} from "../../../utils/kalman";
import { ChartCanvas } from "../ChartCanvas";
import { KDerivationPanel } from "../KDerivationPanel";
import { createRiskWindowPlugin } from "../riskWindowPlugin";
import { SensitivityChart } from "./SensitivityChart";
import { COLORS } from "../kalmanColors";
import styles from "../kalman.module.css";

const baseScales = {
  x: { type: "linear", title: { display: true, text: "Time (s)" } },
  y: { title: { display: true, text: "Amplitude (mV)" } },
};

export function InitialConditionsPanel({
  cleanSignal = [],
  noisySignal = [],
  times = [],
  dt = 0.002,
}) {
  const { applyNoiseTrigger, kalmanParams } = useContext(SimulationContext);
  const { P0_alpha, R } = kalmanParams;
  const showRiskWindow = P0_alpha < 1;

  const filterResult = useMemo(() => {
    if (!cleanSignal.length || !noisySignal.length) return null;
    const result = runKalmanFilter(
      noisySignal,
      dt,
      kalmanParams.x0hat,
      kalmanParams.P0_alpha,
      kalmanParams.Q_diag,
      kalmanParams.R
    );
    const P_inf = solvePInfinity(dt, kalmanParams.Q_diag, kalmanParams.R);
    return { ...result, P_inf };
  }, [cleanSignal, noisySignal, dt, kalmanParams]);

  const metrics = useMemo(() => {
    if (!filterResult) return null;
    const { xFiltered, P_trace, P_inf } = filterResult;
    const transient = computeTransientLength(P_trace, P_inf);
    const earlyRmse = computeRMSE(xFiltered, cleanSignal, 0, Math.min(50, xFiltered.length));
    const lateStart = Math.max(0, xFiltered.length - 50);
    const lateRmse = computeRMSE(xFiltered, cleanSignal, lateStart, xFiltered.length);
    return { transient, earlyRmse, lateRmse, badge: convergenceBadge(transient) };
  }, [filterResult, cleanSignal]);

  const riskPlugin = useMemo(
    () =>
      createRiskWindowPlugin(
        times,
        filterResult?.P_trace,
        filterResult?.P_inf,
        showRiskWindow
      ),
    [times, filterResult?.P_trace, filterResult?.P_inf, showRiskWindow]
  );

  const signalChartDeps = [
    times,
    cleanSignal,
    noisySignal,
    filterResult?.xFiltered,
    filterResult?.P_trace,
    filterResult?.P_inf,
    applyNoiseTrigger,
    showRiskWindow,
  ];

  const buildSignalChart = () => {
    if (!filterResult || !times.length) return null;
    const n = times.length;
    return {
      type: "line",
      data: {
        datasets: [
          {
            label: "True clean ECG",
            data: Array.from({ length: n }, (_, i) => ({
              x: times[i],
              y: cleanSignal[i],
            })),
            borderColor: COLORS.gray,
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
          },
          {
            label: "Noisy measurements",
            data: times.map((x, i) => ({ x, y: noisySignal[i] })),
            borderColor: COLORS.coral,
            backgroundColor: COLORS.coral,
            showLine: false,
            pointRadius: 1.5,
          },
          {
            label: "Kalman filtered",
            data: times.map((x, i) => ({
              x,
              y: filterResult.xFiltered[i],
            })),
            borderColor: COLORS.teal,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: {
          title: {
            display: true,
            text: "Signal: Truth vs Noisy vs Filtered",
            font: { size: 14, weight: "600" },
          },
          legend: { labels: { boxWidth: 12 } },
        },
        scales: baseScales,
      },
      plugins: [riskPlugin],
    };
  };

  const uncertaintyDeps = [times, filterResult?.P_trace, filterResult?.K_trace, filterResult?.P_inf];

  const buildUncertaintyChart = () => {
    if (!filterResult) return null;
    const steps = filterResult.P_trace.map((y, i) => ({ x: times[i] ?? i, y }));
    const gains = filterResult.K_trace.map((y, i) => ({ x: times[i] ?? i, y }));
    return {
      type: "line",
      data: {
        datasets: [
          {
            label: "P_k[0,0]",
            data: steps,
            borderColor: COLORS.amber,
            borderWidth: 2,
            pointRadius: 0,
            yAxisID: "y",
          },
          {
            label: "K_k",
            data: gains,
            borderColor: COLORS.purple,
            borderWidth: 2,
            pointRadius: 0,
            yAxisID: "y1",
          },
          {
            label: "P∞ (steady state)",
            data: steps.map((p) => ({ x: p.x, y: filterResult.P_inf })),
            borderColor: COLORS.gray,
            borderDash: [4, 4],
            borderWidth: 1,
            pointRadius: 0,
            yAxisID: "y",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: {
          title: {
            display: true,
            text: "Uncertainty P_k and Kalman Gain K_k",
            font: { size: 13, weight: "600" },
          },
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "Time (s)" } },
          y: { position: "left", title: { display: true, text: "P_k" } },
          y1: {
            position: "right",
            title: { display: true, text: "K_k" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };
  };

  if (!times.length) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal and add noise. Tune x̂₀, P₀, Q, and R in the right
        panel.
      </p>
    );
  }

  return (
    <div className={styles.panelRoot}>
      <h3 className={styles.panelTitle}>Initial Conditions Experiment ★</h3>

      <KDerivationPanel P0_alpha={P0_alpha} R={R} />

      {!applyNoiseTrigger && (
        <p className={styles.hintText}>
          Tip: Add noise via the right panel for realistic measurements.
        </p>
      )}

      <div className={styles.chartsOnlyCol}>
        <ChartCanvas
          buildConfig={buildSignalChart}
          deps={signalChartDeps}
          className={styles.chartBox}
        />

        {metrics && (
          <div className={styles.metricsRow}>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Transient Length</p>
              <p className={styles.metricValue}>{metrics.transient} steps</p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Early RMSE</p>
              <p className={styles.metricValue}>{metrics.earlyRmse.toFixed(4)}</p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Late RMSE</p>
              <p className={styles.metricValue}>{metrics.lateRmse.toFixed(4)}</p>
            </div>
            <div className={styles.metricCard}>
              <p className={styles.metricLabel}>Convergence</p>
              <p className={styles.metricValue}>
                <span
                  className={styles.badge}
                  style={{ background: metrics.badge.color }}
                >
                  {metrics.badge.label}
                </span>
              </p>
            </div>
          </div>
        )}

        <ChartCanvas
          buildConfig={buildUncertaintyChart}
          deps={uncertaintyDeps}
          className={styles.chartBoxSmall}
        />

        <SensitivityChart
          cleanSignal={cleanSignal}
          noisySignal={noisySignal}
          dt={dt}
        />
      </div>
    </div>
  );
}
