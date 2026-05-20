import { useContext, useMemo } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import { runKalmanFilter, computeRMSE } from "../../../utils/kalman";
import { ChartCanvas } from "../ChartCanvas";
import { COLORS } from "../kalmanColors";
import styles from "../kalman.module.css";

const OFFSET_MIN = -1.5;
const OFFSET_MAX = 1.5;
const OFFSET_STEP = 0.1;
const P0_LOW = 0.01;
const P0_HIGH = 50;
const EARLY_N = 50;

export function SensitivityChart({
  cleanSignal = [],
  noisySignal = [],
  dt = 0.002,
}) {
  const { kalmanParams, cleanSignal: ctxClean, rawSamples } =
    useContext(SimulationContext);

  const trueFirstSample = useMemo(() => {
    if (ctxClean.length) return ctxClean[0];
    if (rawSamples.length) return rawSamples[0].y;
    return 0;
  }, [ctxClean, rawSamples]);

  const currentOffset = kalmanParams.x0hat - trueFirstSample;

  const curves = useMemo(() => {
    if (!noisySignal.length || !cleanSignal.length) return null;
    const { Q_diag, R } = kalmanParams;
    const offsets = [];
    const lowLine = [];
    const highLine = [];

    for (let off = OFFSET_MIN; off <= OFFSET_MAX + 1e-9; off += OFFSET_STEP) {
      offsets.push(off);
      const x0 = trueFirstSample + off;

      const resLow = runKalmanFilter(
        noisySignal,
        dt,
        x0,
        P0_LOW,
        Q_diag,
        R,
        { includeTraces: false }
      );
      const resHigh = runKalmanFilter(
        noisySignal,
        dt,
        x0,
        P0_HIGH,
        Q_diag,
        R,
        { includeTraces: false }
      );

      lowLine.push(
        computeRMSE(resLow.xFiltered, cleanSignal, 0, Math.min(EARLY_N, resLow.xFiltered.length))
      );
      highLine.push(
        computeRMSE(resHigh.xFiltered, cleanSignal, 0, Math.min(EARLY_N, resHigh.xFiltered.length))
      );
    }

    return { offsets, lowLine, highLine };
  }, [noisySignal, cleanSignal, dt, kalmanParams.Q_diag, kalmanParams.R, trueFirstSample]);

  const markerRmse = useMemo(() => {
    if (!curves) return { low: 0, high: 0 };
    const idx = Math.round((currentOffset - OFFSET_MIN) / OFFSET_STEP);
    const clamped = Math.max(0, Math.min(curves.lowLine.length - 1, idx));
    return {
      low: curves.lowLine[clamped],
      high: curves.highLine[clamped],
    };
  }, [curves, currentOffset]);

  const chartDeps = [curves, currentOffset, markerRmse];

  const buildChart = () => {
    if (!curves) return null;
    const { offsets, lowLine, highLine } = curves;
    const lowData = offsets.map((x, i) => ({ x, y: lowLine[i] }));
    const highData = offsets.map((x, i) => ({ x, y: highLine[i] }));

    return {
      type: "line",
      data: {
        datasets: [
          {
            label: `Low uncertainty (P₀ = ${P0_LOW})`,
            data: lowData,
            borderColor: COLORS.coral,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.15,
          },
          {
            label: `High uncertainty (P₀ = ${P0_HIGH})`,
            data: highData,
            borderColor: COLORS.teal,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.15,
          },
          {
            label: "Marker (low P₀)",
            data: [{ x: currentOffset, y: markerRmse.low }],
            borderColor: COLORS.coral,
            backgroundColor: COLORS.coral,
            pointRadius: 7,
            showLine: false,
          },
          {
            label: "Marker (high P₀)",
            data: [{ x: currentOffset, y: markerRmse.high }],
            borderColor: COLORS.teal,
            backgroundColor: COLORS.teal,
            pointRadius: 7,
            showLine: false,
          },
          {
            label: "Current offset",
            data: [
              { x: currentOffset, y: 0 },
              { x: currentOffset, y: Math.max(...lowLine, ...highLine, 0.01) },
            ],
            borderColor: COLORS.gray,
            borderDash: [4, 4],
            borderWidth: 1.5,
            pointRadius: 0,
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
            text: "How much does a wrong x̂₀ hurt? (sensitivity analysis)",
            font: { size: 13, weight: "600" },
          },
          legend: { labels: { boxWidth: 12 } },
          annotation: undefined,
        },
        scales: {
          x: {
            type: "linear",
            min: OFFSET_MIN,
            max: OFFSET_MAX,
            title: { display: true, text: "Initial guess error (mV)" },
          },
          y: {
            title: { display: true, text: "Early RMSE" },
            min: 0,
          },
        },
      },
    };
  };

  if (!noisySignal.length) return null;

  return (
    <div className={styles.sensitivityBlock}>
      <ChartCanvas
        buildConfig={buildChart}
        deps={chartDeps}
        className={styles.chartBoxSmall}
      />
      <p className={styles.hintText}>
        High P₀ line stays flat — a wrong initial guess barely matters when you
        admit uncertainty
      </p>
    </div>
  );
}
