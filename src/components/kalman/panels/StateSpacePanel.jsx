import { useContext, useMemo, useRef, useState, useEffect } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import { useKalmanSignals } from "../../../hooks/useKalmanSignals";
import { useChartJs } from "../../../hooks/useChartJs";
import { predictStep, fmt4 } from "../../../utils/kalman";
import { createTimeCursorPlugin } from "../timeCursorPlugin";
import { PanelHeader } from "../PanelHeader";
import { COLORS } from "../kalmanColors";
import styles from "../kalman.module.css";

const FS_OPTIONS = [100, 250, 500];

export function StateSpacePanel({
  cleanSignal = [],
  noisySignal = [],
  times = [],
  dt: sampleDt,
}) {
  void sampleDt;
  const { applyNoiseTrigger, setKalmanParams, kalmanParams } =
    useContext(SimulationContext);
  const { filterResult } = useKalmanSignals();
  const [cursorIndex, setCursorIndex] = useState(0);
  const cursorRef = useRef(0);
  const [showPredict, setShowPredict] = useState(false);
  const [predictLines, setPredictLines] = useState(0);

  const fs = kalmanParams.fsKalman ?? 500;
  const dt = 1 / fs;

  useEffect(() => {
    cursorRef.current = cursorIndex;
  }, [cursorIndex]);

  const stateAtCursor = useMemo(() => {
    const states = filterResult?.xStates ?? [];
    const idx = Math.min(cursorIndex, Math.max(0, states.length - 1));
    if (!states.length) return { amp: 0, slope: 0 };
    return { amp: states[idx][0], slope: states[idx][1] };
  }, [filterResult, cursorIndex]);

  const pred = predictStep(stateAtCursor.amp, stateAtCursor.slope, dt);

  const chartDeps = [times, cleanSignal, noisySignal, applyNoiseTrigger, cursorIndex];

  const buildChart = () => {
    if (!times.length) return null;
    const truthData = times.map((x, i) => ({ x, y: cleanSignal[i] }));
    const measureData = applyNoiseTrigger
      ? times.map((x, i) => ({ x, y: noisySignal[i] }))
      : truthData;
    const plugin = createTimeCursorPlugin(cursorRef, setCursorIndex, times.length);

    return {
      type: "line",
      data: {
        datasets: [
          {
            label: "ECG (reference)",
            data: truthData,
            borderColor: COLORS.gray,
            borderWidth: 1,
            pointRadius: 0,
          },
          {
            label: "Measurements",
            data: measureData,
            borderColor: COLORS.coral,
            borderWidth: 1,
            pointRadius: 0,
            borderDash: applyNoiseTrigger ? [] : [4, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: "Drag or click chart to inspect state",
          },
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "Time (s)" } },
          y: { title: { display: true, text: "Amplitude (mV)" } },
        },
      },
      plugins: [plugin],
    };
  };

  const { canvasRef } = useChartJs(buildChart, chartDeps);

  if (!times.length) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to explore state-space intuition.
      </p>
    );
  }

  return (
    <div className={styles.panelRoot}>
      <PanelHeader title="State-Space Intuition" />

      <div className={styles.stateCards}>
        <div className={styles.stateCard}>
          <p className={styles.stateCardLabel}>x̂[0] = amplitude</p>
          <p className={styles.stateCardValue}>{fmt4(stateAtCursor.amp)} mV</p>
        </div>
        <div className={styles.stateCard}>
          <p className={styles.stateCardLabel}>x̂[1] = slope</p>
          <p className={styles.stateCardValue}>{fmt4(stateAtCursor.slope)}</p>
        </div>
      </div>

      <div className={styles.chartBox}>
        <canvas ref={canvasRef} />
      </div>

      <h4>F Matrix Visualizer</h4>
      <label>
        Sampling rate:{" "}
        <select
          className={styles.fsSelect}
          value={fs}
          onChange={(e) =>
            setKalmanParams((p) => ({ ...p, fsKalman: Number(e.target.value) }))
          }
        >
          {FS_OPTIONS.map((hz) => (
            <option key={hz} value={hz}>
              {hz} Hz
            </option>
          ))}
        </select>
      </label>
      <p className={styles.hintText}>F predicts next state from current state</p>
      <div className={styles.fMatrix}>
        <span className={styles.fMatrixBracket}>[</span>
        <span className={styles.fMatrixCell}>1</span>
        <span className={styles.fMatrixCell}>{fmt4(dt)}</span>
        <span className={styles.fMatrixBracket}> </span>
        <span className={styles.fMatrixCell}>0</span>
        <span className={styles.fMatrixCell}>1</span>
        <span className={styles.fMatrixBracket}>]</span>
      </div>

      <button
        type="button"
        className={styles.primaryBtn}
        onClick={() => {
          const next = !showPredict;
          setShowPredict(next);
          if (!next) {
            setPredictLines(0);
            return;
          }
          setPredictLines(0);
          [1, 2, 3, 4, 5].forEach((i) =>
            setTimeout(() => setPredictLines(i), i * 300)
          );
        }}
      >
        Show Predict Step
      </button>

      {showPredict && (
        <div className={styles.predictBox}>
          {predictLines >= 1 && <p className={styles.predictLine}>x̂_pred = F × x̂_k</p>}
          {predictLines >= 2 && (
            <p className={styles.predictLine}>
              {`[ x̂_pred[0] ]   [ 1   ${fmt4(dt)} ] [ ${fmt4(stateAtCursor.amp)} ]`}
            </p>
          )}
          {predictLines >= 3 && (
            <p className={styles.predictLine}>
              {`[ x̂_pred[1] ] = [ 0    1 ] [ ${fmt4(stateAtCursor.slope)} ]`}
            </p>
          )}
          {predictLines >= 4 && (
            <p className={styles.predictLine}>{`= [ ${fmt4(pred[0])} ]`}</p>
          )}
          {predictLines >= 5 && (
            <p className={styles.predictLine}>{`= [ ${fmt4(pred[1])} ]`}</p>
          )}
        </div>
      )}

    </div>
  );
}
