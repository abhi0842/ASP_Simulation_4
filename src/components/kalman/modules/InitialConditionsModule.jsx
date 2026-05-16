import { useContext, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { SimulationContext } from "../../../context/SimulationContext";
import { useKalmanSignals } from "../../../hooks/useKalmanSignals";
import {
  computeRMSE,
  computeTransientLength,
  convergenceBadge,
} from "../../../utils/kalman";
import { KalmanSliders } from "../KalmanSliders";
import { getScenarioPreset, SCENARIO_MESSAGES } from "../../../utils/kalmanScenarios";
import { TheoryModal } from "../TheoryModal";
import { registerKalmanCharts, COLORS, baseChartOptions } from "../kalmanChartSetup";
import styles from "../kalman.module.css";

registerKalmanCharts();

const SCENARIO_CLASS = {
  green: styles.scenarioCardGreen,
  red: styles.scenarioCardRed,
  yellow: styles.scenarioCardYellow,
  blue: styles.scenarioCardBlue,
};

export function InitialConditionsModule() {
  const { setKalmanParams, generateECG, applyNoiseTrigger } =
    useContext(SimulationContext);
  const { aligned, filterResult } = useKalmanSignals();
  const [scenario, setScenario] = useState(null);
  const [theoryOpen, setTheoryOpen] = useState(false);

  const onScenario = (key) => {
    const preset = getScenarioPreset(key, aligned.trueFirstSample);
    if (!preset) return;
    setKalmanParams((p) => ({ ...p, ...preset }));
    setScenario(key);
  };

  const scenarioCard =
    scenario && SCENARIO_MESSAGES[scenario] ? (
      <div
        className={`${styles.scenarioCard} ${SCENARIO_CLASS[SCENARIO_MESSAGES[scenario].tone]}`}
      >
        {SCENARIO_MESSAGES[scenario].text}
      </div>
    ) : null;

  const metrics = useMemo(() => {
    if (!filterResult || !aligned.hasData) return null;
    const { xFiltered, P_trace, P_inf } = filterResult;
    const transient = computeTransientLength(P_trace, P_inf);
    const earlyRmse = computeRMSE(
      xFiltered,
      aligned.truth,
      0,
      Math.min(50, xFiltered.length)
    );
    const lateStart = Math.max(0, xFiltered.length - 50);
    const lateRmse = computeRMSE(
      xFiltered,
      aligned.truth,
      lateStart,
      xFiltered.length
    );
    const badge = convergenceBadge(transient);
    return { transient, earlyRmse, lateRmse, badge };
  }, [filterResult, aligned]);

  const signalChart = useMemo(() => {
    if (!filterResult || !aligned.hasData) return null;
    const pts = (i) => ({ x: aligned.times[i], y: aligned.truth[i] });
    const n = aligned.times.length;
    return {
      data: {
        datasets: [
          {
            label: "True clean ECG",
            data: Array.from({ length: n }, (_, i) => pts(i)),
            borderColor: COLORS.gray,
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
          },
          {
            label: "Noisy measurements",
            data: aligned.times.map((x, i) => ({
              x,
              y: aligned.measurements[i],
            })),
            borderColor: COLORS.coral,
            backgroundColor: COLORS.coral,
            showLine: false,
            pointRadius: 1.5,
          },
          {
            label: "Kalman filtered",
            data: aligned.times.map((x, i) => ({
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
        ...baseChartOptions,
        plugins: {
          ...baseChartOptions.plugins,
          title: {
            display: true,
            text: "Signal: Truth vs Noisy vs Filtered",
            font: { size: 14, weight: "600" },
          },
        },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Time (s)" },
          },
          y: { title: { display: true, text: "Amplitude (mV)" } },
        },
      },
    };
  }, [aligned, filterResult]);

  const uncertaintyChart = useMemo(() => {
    if (!filterResult) return null;
    const steps = filterResult.P_trace.map((_, i) => ({
      x: aligned.times[i] ?? i,
      y: filterResult.P_trace[i],
    }));
    const gains = filterResult.K_trace.map((_, i) => ({
      x: aligned.times[i] ?? i,
      y: filterResult.K_trace[i],
    }));
    return {
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
        ...baseChartOptions,
        plugins: {
          ...baseChartOptions.plugins,
          title: {
            display: true,
            text: "Uncertainty P_k and Kalman Gain K_k",
            font: { size: 13, weight: "600" },
          },
        },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Time (s)" },
          },
          y: {
            position: "left",
            title: { display: true, text: "P_k" },
          },
          y1: {
            position: "right",
            title: { display: true, text: "K_k" },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };
  }, [filterResult, aligned.times]);

  if (!generateECG) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal and add noise to explore initial conditions.
      </p>
    );
  }

  return (
    <div>
      <div className={styles.moduleHeader}>
        <h3>Initial Conditions Experiment ★</h3>
        <button
          type="button"
          className={styles.theoryBtn}
          onClick={() => setTheoryOpen(true)}
        >
          Theory Link
        </button>
      </div>

      <div className={styles.twoCol}>
        <KalmanSliders
          trueFirstSample={aligned.trueFirstSample}
          onScenario={onScenario}
          scenarioCard={scenarioCard}
        />
        <div className={styles.chartsCol}>
          {!applyNoiseTrigger && (
            <p className={styles.hintText}>
              Tip: Add noise via the right panel for realistic measurements.
            </p>
          )}
          {signalChart && (
            <div className={styles.chartBox}>
              <Line data={signalChart.data} options={signalChart.options} />
            </div>
          )}
          {metrics && (
            <div className={styles.metricsRow}>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Transient Length</p>
                <p className={styles.metricValue}>{metrics.transient} steps</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Early RMSE</p>
                <p className={styles.metricValue}>
                  {metrics.earlyRmse.toFixed(4)}
                </p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Late RMSE</p>
                <p className={styles.metricValue}>
                  {metrics.lateRmse.toFixed(4)}
                </p>
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
          {uncertaintyChart && (
            <div className={styles.chartBoxSmall}>
              <Line
                data={uncertaintyChart.data}
                options={uncertaintyChart.options}
              />
            </div>
          )}
        </div>
      </div>

      {theoryOpen && (
        <TheoryModal
          theoryKey="initialConditions"
          onClose={() => setTheoryOpen(false)}
        />
      )}
    </div>
  );
}
