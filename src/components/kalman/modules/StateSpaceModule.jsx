import { useContext, useMemo, useRef, useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { SimulationContext } from "../../../context/SimulationContext";
import { useKalmanSignals } from "../../../hooks/useKalmanSignals";
import { buildFMatrix, predictStep, fmt4 } from "../../../utils/kalman";
import { TheoryModal } from "../TheoryModal";
import { createTimeCursorPlugin } from "../timeCursorPlugin";
import { registerKalmanCharts, COLORS, baseChartOptions } from "../kalmanChartSetup";
import styles from "../kalman.module.css";

registerKalmanCharts();

const FS_OPTIONS = [100, 250, 500];

export function StateSpaceModule() {
  const { generateECG, applyNoiseTrigger, setKalmanParams, kalmanParams } =
    useContext(SimulationContext);
  const { aligned, filterResult } = useKalmanSignals();
  const [cursorIndex, setCursorIndex] = useState(0);
  const cursorRef = useRef(0);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [showPredict, setShowPredict] = useState(false);
  const [predictLines, setPredictLines] = useState(0);

  const fs = kalmanParams.fsKalman ?? 500;
  const dt = 1 / fs;

  useEffect(() => {
    cursorRef.current = cursorIndex;
  }, [cursorIndex]);

  useEffect(() => {
    if (!showPredict) {
      setPredictLines(0);
      return;
    }
    setPredictLines(0);
    const timers = [];
    for (let i = 1; i <= 5; i++) {
      timers.push(setTimeout(() => setPredictLines(i), i * 300));
    }
    return () => timers.forEach(clearTimeout);
  }, [showPredict, cursorIndex, fs]);

  const stateAtCursor = useMemo(() => {
    const states = filterResult?.xStates ?? [];
    const idx = Math.min(cursorIndex, Math.max(0, states.length - 1));
    if (!states.length) return { amp: 0, slope: 0 };
    return { amp: states[idx][0], slope: states[idx][1] };
  }, [filterResult, cursorIndex]);

  const pred = predictStep(stateAtCursor.amp, stateAtCursor.slope, dt);
  const F = buildFMatrix(dt);

  const chartConfig = useMemo(() => {
    if (!aligned.hasData) return null;
    const n = aligned.times.length;
    const truthData = aligned.times.map((x, i) => ({ x, y: aligned.truth[i] }));
    const measureData = applyNoiseTrigger
      ? aligned.times.map((x, i) => ({ x, y: aligned.measurements[i] }))
      : truthData;

    const plugin = createTimeCursorPlugin(cursorRef, setCursorIndex, n);

    return {
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
        ...baseChartOptions,
        animation: false,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: "Drag cursor on chart to inspect state",
          },
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "Time (s)" } },
          y: { title: { display: true, text: "Amplitude (mV)" } },
        },
      },
      plugins: [plugin],
    };
  }, [aligned, applyNoiseTrigger]);

  if (!generateECG) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to explore state-space intuition.
      </p>
    );
  }

  return (
    <>
      <div className={styles.moduleHeader}>
        <h3>State-Space Intuition</h3>
        <button
          type="button"
          className={styles.theoryBtn}
          onClick={() => setTheoryOpen(true)}
        >
          Theory Link
        </button>
      </div>

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

      {chartConfig && (
        <div className={styles.chartBox}>
          <Line
            data={chartConfig.data}
            options={chartConfig.options}
            plugins={chartConfig.plugins}
          />
        </div>
      )}

      <h4>F Matrix Visualizer</h4>
      <label>
        Sampling rate:{" "}
        <select
          className={styles.fsSelect}
          value={fs}
          onChange={(e) => {
            const v = Number(e.target.value);
            setKalmanParams((p) => ({ ...p, fsKalman: v }));
          }}
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
        style={{ marginTop: 12 }}
        onClick={() => setShowPredict((s) => !s)}
      >
        Show Predict Step
      </button>

      {showPredict && (
        <div className={styles.predictBox}>
          {predictLines >= 1 && (
            <p className={styles.predictLine} style={{ animationDelay: "0ms" }}>
              x̂_pred = F × x̂_k
            </p>
          )}
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
            <p className={styles.predictLine}>
              {`= [ ${fmt4(pred[0])} ]`}
            </p>
          )}
          {predictLines >= 5 && (
            <p className={styles.predictLine}>
              {`= [ ${fmt4(pred[1])} ]`}
            </p>
          )}
        </div>
      )}

      {theoryOpen && (
        <TheoryModal theoryKey="stateSpace" onClose={() => setTheoryOpen(false)} />
      )}
    </>
  );
}
