import { useContext, useMemo, useState, useRef, useEffect, useCallback } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import {
  runKalmanFilter,
  solvePInfinity,
  computeTransientLength,
  computeRMSE,
  fmt4,
} from "../../../utils/kalman";
import { useChartJs } from "../../../hooks/useChartJs";
import { PanelHeader } from "../PanelHeader";
import { COLORS } from "../kalmanColors";
import styles from "../kalman.module.css";

const P0_TRACES = [
  { label: "P₀ = 0.001", alpha: 0.001, color: COLORS.blue },
  { label: "P₀ = 1.0", alpha: 1.0, color: COLORS.amber },
  { label: "P₀ = 100", alpha: 100, color: COLORS.coral },
];

const RACE_STEPS = 200;

export function ConvergenceRacePanel({
  cleanSignal = [],
  noisySignal = [],
  dt = 0.002,
}) {
  const { kalmanParams } = useContext(SimulationContext);
  const [raceStep, setRaceStep] = useState(0);
  const [racing, setRacing] = useState(false);
  const timerRef = useRef(null);

  const raceData = useMemo(() => {
    if (!noisySignal.length) return null;
    const meas = noisySignal.slice(0, RACE_STEPS);
    const truth = cleanSignal.slice(0, RACE_STEPS);
    const { Q_diag, R, x0hat } = kalmanParams;
    const P_inf = solvePInfinity(dt, Q_diag, R);

    const traces = P0_TRACES.map((t) => {
      const res = runKalmanFilter(meas, dt, x0hat, t.alpha, Q_diag, R);
      return {
        ...t,
        P_trace: res.P_trace,
        conv: computeTransientLength(res.P_trace, P_inf),
        peakRmse: computeRMSE(res.xFiltered, truth, 0, res.xFiltered.length),
      };
    });

    const warm = runKalmanFilter(meas, dt, x0hat, P_inf, Q_diag, R);
    const warmRmse = computeRMSE(warm.xFiltered, truth, 0, warm.xFiltered.length);

    return { traces, P_inf, warmRmse };
  }, [cleanSignal, noisySignal, dt, kalmanParams]);

  const startRace = () => {
    setRacing(true);
    setRaceStep(0);
  };

  useEffect(() => {
    if (!racing || !raceData) return undefined;
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

  const limit = racing ? raceStep : RACE_STEPS;

  const buildRaceChart = useCallback(() => {
    if (!raceData) return null;
    const { traces, P_inf } = raceData;
    return {
      type: "line",
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
            data: Array.from({ length: limit }, (_, i) => ({ x: i, y: P_inf })),
            borderColor: COLORS.gray,
            borderDash: [6, 4],
            borderWidth: 1,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          title: { display: true, text: "P_k[0,0] convergence race" },
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
  }, [raceData, limit]);

  const { canvasRef } = useChartJs(buildRaceChart, [raceData, limit]);

  const allConverged =
    raceData &&
    P0_TRACES.every((t) => convergedAt[t.label]) &&
    !racing &&
    raceStep >= RACE_STEPS;

  if (!noisySignal.length) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to run the convergence race.
      </p>
    );
  }

  return (
    <div className={styles.panelRoot}>
      <PanelHeader title="Convergence Race" />

      <button
        type="button"
        className={styles.primaryBtn}
        onClick={startRace}
        disabled={racing || !raceData}
      >
        Start Race
      </button>

      <div className={styles.chartBox}>
        <canvas ref={canvasRef} />
      </div>

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
          All three reach the same P∞ = {fmt4(raceData.P_inf)}. P₀ only controls
          the transient, not the destination.
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

    </div>
  );
}
