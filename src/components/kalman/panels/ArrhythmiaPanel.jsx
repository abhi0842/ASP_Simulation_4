import { useContext, useMemo, useState, useCallback } from "react";
import { SimulationContext } from "../../../context/SimulationContext";
import {
  runKalmanFilter,
  solvePInfinity,
  samplesToRelock,
} from "../../../utils/kalman";
import {
  extractBeatTemplate,
  generateArrhythmiaSequence,
  addGaussianNoise,
} from "../../../utils/arrhythmiaEcg";
import { useChartJs } from "../../../hooks/useChartJs";
import { PanelHeader } from "../PanelHeader";
import { COLORS } from "../kalmanColors";
import styles from "../kalman.module.css";

const EXPERTS = [
  { name: "Expert A (Adaptive)", Q: 0.05, R: 0.01, P0: 50, color: COLORS.green },
  { name: "Expert B (Rigid)", Q: 0.0001, R: 0.01, P0: 0.01, color: COLORS.red },
  { name: "Expert C (Warm start)", Q: 0.01, R: 0.01, P0: null, color: COLORS.blue },
];

function arrhythmiaLinesPlugin(onsetTime, offsetTime) {
  return {
    id: "arrhythmiaLines",
    afterDraw(chart) {
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      const ctx = chart.ctx;
      [onsetTime, offsetTime].forEach((xVal, i) => {
        if (!Number.isFinite(xVal)) return;
        const px = xScale.getPixelForValue(xVal);
        ctx.save();
        ctx.strokeStyle = COLORS.red;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(px, yScale.top);
        ctx.lineTo(px, yScale.bottom);
        ctx.stroke();
        ctx.fillStyle = COLORS.red;
        ctx.font = "11px sans-serif";
        ctx.fillText(
          i === 0 ? "← Arrhythmia onset" : "Arrhythmia offset →",
          px + 4,
          yScale.top + 14
        );
        ctx.restore();
      });
    },
  };
}

export function ArrhythmiaPanel({ cleanSignal = [], dt = 0.002 }) {
  const { originalFs, kalmanParams } = useContext(SimulationContext);
  const [studentRun, setStudentRun] = useState(false);
  const [measurements, setMeasurements] = useState([]);

  const sequence = useMemo(() => {
    if (!cleanSignal.length) return null;
    const template = extractBeatTemplate(cleanSignal, originalFs);
    return generateArrhythmiaSequence(template, originalFs);
  }, [cleanSignal, originalFs]);

  const runStudentFilter = () => {
    if (!sequence) return;
    setMeasurements(addGaussianNoise(sequence.truth, kalmanParams.R));
    setStudentRun(true);
  };

  const filterOutputs = useMemo(() => {
    if (!sequence || !studentRun || !measurements.length) return null;
    const { truth, onsetIdx } = sequence;
    const P_inf = solvePInfinity(dt, kalmanParams.Q_diag, kalmanParams.R);

    const student = runKalmanFilter(
      measurements,
      dt,
      kalmanParams.x0hat,
      kalmanParams.P0_alpha,
      kalmanParams.Q_diag,
      kalmanParams.R
    );

    const experts = EXPERTS.map((ex) => {
      const P0 = ex.P0 === null ? P_inf : ex.P0;
      const res = runKalmanFilter(measurements, dt, 0, P0, ex.Q, ex.R);
      return {
        ...ex,
        filtered: res.xFiltered,
        recovery: samplesToRelock(res.xFiltered, truth, onsetIdx),
      };
    });

    return {
      student: student.xFiltered,
      studentRecovery: samplesToRelock(student.xFiltered, truth, onsetIdx),
      experts,
    };
  }, [sequence, measurements, studentRun, kalmanParams, dt]);

  const onsetTime = sequence?.times[sequence.onsetIdx];
  const offsetTime = sequence?.times[sequence.offsetIdx];

  const buildSignalChart = useCallback(() => {
    if (!sequence) return null;
    const { times, truth } = sequence;
    const datasets = [
      {
        label: "True ECG (arrhythmia)",
        data: times.map((x, i) => ({ x, y: truth[i] })),
        borderColor: COLORS.gray,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ];

    if (filterOutputs) {
      datasets.push({
        label: "Your filter",
        data: times.map((x, i) => ({ x, y: filterOutputs.student[i] })),
        borderColor: COLORS.purple,
        borderWidth: 2,
        pointRadius: 0,
      });
      filterOutputs.experts.forEach((ex) => {
        datasets.push({
          label: ex.name,
          data: times.map((x, i) => ({ x, y: ex.filtered[i] })),
          borderColor: ex.color,
          borderWidth: 1.5,
          pointRadius: 0,
        });
      });
    }

    return {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Arrhythmia tracking challenge (20 beats)",
          },
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "Time (s)" } },
          y: { title: { display: true, text: "Amplitude (mV)" } },
        },
      },
      plugins: [arrhythmiaLinesPlugin(onsetTime, offsetTime)],
    };
  }, [sequence, filterOutputs, onsetTime, offsetTime]);

  const buildRecoveryChart = useCallback(() => {
    if (!filterOutputs) return null;
    const labels = ["Your filter", ...filterOutputs.experts.map((e) => e.name)];
    const values = [
      filterOutputs.studentRecovery,
      ...filterOutputs.experts.map((e) => e.recovery),
    ];
    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Samples to re-lock",
            data: values,
            backgroundColor: [
              COLORS.purple,
              COLORS.green,
              COLORS.red,
              COLORS.blue,
            ],
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Samples to re-lock after arrhythmia onset",
          },
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: "Samples" } },
        },
      },
    };
  }, [filterOutputs]);

  const signalDeps = [sequence, filterOutputs, onsetTime, offsetTime];
  const recoveryDeps = [filterOutputs];

  const { canvasRef: signalCanvasRef } = useChartJs(buildSignalChart, signalDeps);
  const { canvasRef: recoveryCanvasRef } = useChartJs(
    buildRecoveryChart,
    recoveryDeps
  );

  if (!cleanSignal.length) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to start the arrhythmia challenge.
      </p>
    );
  }

  return (
    <div className={styles.panelRoot}>
      <PanelHeader title="Arrhythmia Tracking Challenge" />

      <p className={styles.hintText}>
        Beats 1–8: 70 BPM · Beats 9–12: 140 BPM (tachycardia) · Beats 13–20: 70
        BPM recovery. Set Kalman parameters in the right panel, then run.
      </p>

      <button type="button" className={styles.primaryBtn} onClick={runStudentFilter}>
        Run My Filter
      </button>

      <div className={styles.chartBox}>
        <canvas ref={signalCanvasRef} />
      </div>

      {filterOutputs && (
        <div className={styles.recoveryChart}>
          <canvas ref={recoveryCanvasRef} />
        </div>
      )}

      {studentRun && (
        <div className={styles.insightCard}>
          Expert A recovers fastest because large Q tells the filter to expect
          rapid signal changes. Expert B is slowest — rigid low Q assumes the
          signal is nearly constant, making it blind to sudden changes.
        </div>
      )}

    </div>
  );
}
