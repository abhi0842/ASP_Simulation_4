import { useContext, useMemo, useState } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import {
  runKalmanFilter,
  solvePInfinity,
  computeRMSE,
  computeTransientLength,
  convergenceBadge,
} from "../../../utils/kalman";
import { getScenarioPreset } from "../../../utils/kalmanScenarios";
import { ChartCanvas } from "../ChartCanvas";
import { COLORS } from "../kalmanColors";
import styles from "../kalman.module.css";

const SCENARIOS = [
  { key: "A", label: "Scenario A", color: COLORS.teal },
  { key: "B", label: "Scenario B", color: COLORS.coral },
  { key: "C", label: "Scenario C", color: COLORS.amber },
  { key: "D", label: "Scenario D", color: COLORS.purple },
];

function highlightClass(values, idx, lowerIsBetter = true) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return "";
  const best = lowerIsBetter ? Math.min(...finite) : Math.max(...finite);
  const worst = lowerIsBetter ? Math.max(...finite) : Math.min(...finite);
  if (values[idx] === best && best !== worst) return styles.cellBest;
  if (values[idx] === worst && best !== worst) return styles.cellWorst;
  return "";
}

export function ComparisonPanel({
  cleanSignal = [],
  noisySignal = [],
  times = [],
  dt = 0.002,
}) {
  const { kalmanParams, cleanSignal: ctxClean, rawSamples } =
    useContext(SimulationContext);
  const [visible, setVisible] = useState({ A: true, B: true, C: true, D: true });

  const trueFirstSample = useMemo(() => {
    if (ctxClean.length) return ctxClean[0];
    if (rawSamples.length) return rawSamples[0].y;
    return 0;
  }, [ctxClean, rawSamples]);

  const comparisonData = useMemo(() => {
    if (!noisySignal.length || !cleanSignal.length) return null;
    const { Q_diag, R } = kalmanParams;
    const P_inf = solvePInfinity(dt, Q_diag, R);

    const rows = SCENARIOS.map(({ key, label, color }) => {
      const preset = getScenarioPreset(key, trueFirstSample);
      const result = runKalmanFilter(
        noisySignal,
        dt,
        preset.x0hat,
        preset.P0_alpha,
        Q_diag,
        R
      );
      const transient = computeTransientLength(result.P_trace, P_inf);
      const earlyRmse = computeRMSE(
        result.xFiltered,
        cleanSignal,
        0,
        Math.min(50, result.xFiltered.length)
      );
      const lateStart = Math.max(0, result.xFiltered.length - 50);
      const lateRmse = computeRMSE(
        result.xFiltered,
        cleanSignal,
        lateStart,
        result.xFiltered.length
      );
      const badge = convergenceBadge(transient);
      return {
        key,
        label,
        color,
        preset,
        xFiltered: result.xFiltered,
        metrics: { transient, earlyRmse, lateRmse, badge },
      };
    });

    return { rows, P_inf };
  }, [noisySignal, cleanSignal, dt, kalmanParams, trueFirstSample]);

  const chartDeps = [
    times,
    cleanSignal,
    comparisonData,
    visible,
    kalmanParams.Q_diag,
    kalmanParams.R,
  ];

  const buildOverlayChart = () => {
    if (!comparisonData || !times.length) return null;
    const n = times.length;
    const datasets = [
      {
        label: "True ECG",
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
    ];

    comparisonData.rows.forEach((row) => {
      if (!visible[row.key]) return;
      datasets.push({
        label: row.label,
        data: times.map((x, i) => ({ x, y: row.xFiltered[i] })),
        borderColor: row.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      });
    });

    return {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        plugins: {
          title: {
            display: true,
            text: "Scenario comparison (shared Q, R)",
            font: { size: 14, weight: "600" },
          },
          legend: { labels: { boxWidth: 12 } },
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "Time (s)" } },
          y: { title: { display: true, text: "Amplitude (mV)" } },
        },
      },
    };
  };

  const toggleScenario = (key) => {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  };

  if (!times.length) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal and add noise to compare scenarios A–D.
      </p>
    );
  }

  if (!comparisonData) return null;

  const earlyVals = comparisonData.rows.map((r) => r.metrics.earlyRmse);
  const lateVals = comparisonData.rows.map((r) => r.metrics.lateRmse);
  const transVals = comparisonData.rows.map((r) => r.metrics.transient);
  const badgeOrder = { Fast: 0, Medium: 1, Slow: 2 };
  const badgeVals = comparisonData.rows.map(
    (r) => badgeOrder[r.metrics.badge.label] ?? 1
  );

  return (
    <div className={styles.panelRoot}>
      <h3 className={styles.panelTitle}>Scenario Comparison</h3>
      <p className={styles.hintText}>
        All four presets run on the same ECG with current Q and R.
      </p>

      <div className={styles.scenarioToggles}>
        {SCENARIOS.map((s) => (
          <label key={s.key} className={styles.scenarioToggle}>
            <input
              type="checkbox"
              checked={visible[s.key]}
              onChange={() => toggleScenario(s.key)}
            />
            <span style={{ color: s.color }}>{s.label}</span>
          </label>
        ))}
      </div>

      <ChartCanvas
        buildConfig={buildOverlayChart}
        deps={chartDeps}
        className={styles.chartBox}
      />

      <table className={styles.compareTable}>
        <thead>
          <tr>
            <th>Scenario</th>
            <th>x̂₀</th>
            <th>P₀</th>
            <th>Early RMSE</th>
            <th>Late RMSE</th>
            <th>Transient Length</th>
            <th>Badge</th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.rows.map((row, i) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{row.preset.x0hat.toFixed(3)}</td>
              <td>{row.preset.P0_alpha}</td>
              <td className={highlightClass(earlyVals, i)}>{row.metrics.earlyRmse.toFixed(4)}</td>
              <td className={highlightClass(lateVals, i)}>{row.metrics.lateRmse.toFixed(4)}</td>
              <td className={highlightClass(transVals, i)}>{row.metrics.transient}</td>
              <td className={highlightClass(badgeVals, i)}>
                <span
                  className={styles.badge}
                  style={{ background: row.metrics.badge.color }}
                >
                  {row.metrics.badge.label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


