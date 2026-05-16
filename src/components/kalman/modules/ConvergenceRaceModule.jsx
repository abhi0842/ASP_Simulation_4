import { useContext, useMemo, useState, useRef, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { SimulationContext } from "../../../context/SimulationContext";
import { useKalmanSignals } from "../../../hooks/useKalmanSignals";
import {
  runKalmanFilter,
  solvePInfinity,
  computeTransientLength,
  computeRMSE,
  fmt4,
} from "../../../utils/kalman";
import { TheoryModal } from "../TheoryModal";
import { registerKalmanCharts, COLORS, baseChartOptions } from "../kalmanChartSetup";
import styles from "../kalman.module.css";

registerKalmanCharts();

const P0_TRACES = [
  { label: "P₀ = 0.001", alpha: 0.001, color: COLORS.blue },
  { label: "P₀ = 1.0", alpha: 1.0, color: COLORS.amber },
  { label: "P₀ = 100", alpha: 100, color: COLORS.coral },
];

const RACE_STEPS = 200;

export function ConvergenceRaceModule() {
  const { generateECG, kalmanParams } = useContext(SimulationContext);
  const { aligned, dt } = useKalmanSignals();
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [raceStep, setRaceStep] = useState(0);
  const [racing, setRacing] = useState(false);
  const timerRef = useRef(null);

  const raceData = useMemo(() => {
    if (!aligned.hasData) return null;
    const meas = aligned.measurements.slice(0, RACE_STEPS);
    const truth = aligned.truth.slice(0, RACE_STEPS);
    const { Q_diag, R, x0hat } = kalmanParams;
    const P_inf = solvePInfinity(dt, Q_diag, R);

    const traces = P0_TRACES.map((t) => {
      const res = runKalmanFilter(
        meas,
        dt,
        x0hat,
        t.alpha,
        Q_diag,
        R
      );
      const conv = computeTransientLength(res.P_trace, P_inf);
      const peakRmse = computeRMSE(res.xFiltered, truth, 0, res.xFiltered.length);
      return { ...t, P_trace: res.P_trace, conv, peakRmse };
    });

    const warm = runKalmanFilter(meas, dt, x0hat, P_inf, Q_diag, R);
    const warmRmse = computeRMSE(warm.xFiltered, truth, 0, warm.xFiltered.length);

    return { traces, P_inf, warmRmse, truth, meas };
  }, [aligned, dt, kalmanParams]);

  const startRace = () => {
    setRacing(true);
    setRaceStep(0);
  };

  const convergedAt = useMemo(() => {
    if (!raceData || raceStep === 0) return {};
    const { P_inf, traces } = raceData;
    const out = {};
    traces.forEach((t) => {
      for (let i = 0; i < raceStep; i++) {
        if (Math.abs(t.P_trace[i] - P_inf) / P_inf < 0.05) {
          out[t.label] = i + 1;
          break;
        }
      }
    });
    return out;
  }, [raceData, raceStep]);

  useEffect(() => {
    if (!racing || !raceData) return;
    timerRef.current = setInterval(() => {
      setRaceStep((s) => {
        const next = s + 1;
        if (next >= RACE_STEPS) {
          clearInterval(timerRef.current);
          setRacing(false);
        }
        return Math.min(next, RACE_STEPS);
      });
    }, 20);
    return () => clearInterval(timerRef.current);
  }, [racing, raceData]);

  const chartConfig = useMemo(() => {
    if (!raceData) return null;
    const { traces, P_inf } = raceData;
    const limit = racing ? raceStep : RACE_STEPS;

    return {
      data: {
        datasets: [
          ...traces.map((t) => ({
            label: t.label,
            data: t.P_trace.slice(0, limit).map((y, i) => ({ x: i, y })),
            borderColor: t.color,
            borderWidth: 2,
            pointRadius: 0,
          })),
          {
            label: "P∞ (steady state)",
            data: Array.from({ length: limit }, (_, i) => ({
              x: i,
              y: P_inf,
            })),
            borderColor: COLORS.gray,
            borderDash: [6, 4],
            borderWidth: 1,
            pointRadius: 0,
          },
        ],
      },
      options: {
        ...baseChartOptions,
        animation: false,
        plugins: {
          title: {
            display: true,
            text: "P_k[0,0] convergence race",
          },
        },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Steps" },
            min: 0,
            max: RACE_STEPS,
          },
          y: {
            type: "logarithmic",
            title: { display: true, text: "P_k[0,0]" },
          },
        },
      },
    };
  }, [raceData, raceStep, racing]);

  const allConverged =
    raceData &&
    P0_TRACES.every((t) => convergedAt[t.label]) &&
    !racing &&
    raceStep >= RACE_STEPS;

  if (!generateECG) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to run the convergence race.
      </p>
    );
  }

  return (
    <>
      <div className={styles.moduleHeader}>
        <h3>Convergence Race</h3>
        <button
          type="button"
          className={styles.theoryBtn}
          onClick={() => setTheoryOpen(true)}
        >
          Theory Link
        </button>
      </div>

      <button
        type="button"
        className={styles.primaryBtn}
        onClick={startRace}
        disabled={racing || !raceData}
      >
        Start Race
      </button>

      {chartConfig && (
        <div className={styles.chartBox} style={{ marginTop: 12 }}>
          <Line data={chartConfig.data} options={chartConfig.options} />
        </div>
      )}

      <div className={styles.raceBadges}>
        {P0_TRACES.map((t) =>
          convergedAt[t.label] ? (
            <span key={t.label} style={{ color: t.color }}>
              {t.label} converged at step {convergedAt[t.label]}
            </span>
          ) : null
        )}
      </div>

      {allConverged && raceData && (
        <p className={styles.raceSummary}>
          All three reach the same P∞ = {fmt4(raceData.P_inf)}. P₀ only
          controls the transient, not the destination.
        </p>
      )}

      {raceData && (
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th>P₀ value</th>
              <th>Convergence step</th>
              <th>Peak RMSE</th>
            </tr>
          </thead>
          <tbody>
            {raceData.traces.map((t) => (
              <tr key={t.label}>
                <td>{t.alpha}</td>
                <td>{t.conv}</td>
                <td>{t.peakRmse.toFixed(4)}</td>
              </tr>
            ))}
            <tr>
              <td>P∞ (warm start)</td>
              <td>0</td>
              <td>{raceData.warmRmse.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {theoryOpen && (
        <TheoryModal
          theoryKey="convergenceRace"
          onClose={() => setTheoryOpen(false)}
        />
      )}
    </>
  );
}
