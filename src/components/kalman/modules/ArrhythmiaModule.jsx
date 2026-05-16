import { useContext, useMemo, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
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
import { KalmanSliders } from "../KalmanSliders";
import { TheoryModal } from "../TheoryModal";
import { registerKalmanCharts, COLORS, baseChartOptions } from "../kalmanChartSetup";
import styles from "../kalman.module.css";

registerKalmanCharts();

const EXPERTS = [
  { name: "Expert A (Adaptive)", Q: 0.05, R: 0.01, P0: 50, color: COLORS.green },
  { name: "Expert B (Rigid)", Q: 0.0001, R: 0.01, P0: 0.01, color: COLORS.red },
  { name: "Expert C (Warm start)", Q: 0.01, R: 0.01, P0: null, color: COLORS.blue },
];

export function ArrhythmiaModule() {
  const { generateECG, cleanSignal, originalFs, kalmanParams } =
    useContext(SimulationContext);
  const [theoryOpen, setTheoryOpen] = useState(false);
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

  const dt = 1 / originalFs;

  const filterOutputs = useMemo(() => {
    if (!sequence || !studentRun) return null;
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
      P_inf,
    };
  }, [sequence, measurements, studentRun, kalmanParams, dt]);

  const signalChart = useMemo(() => {
    if (!sequence) return null;
    const { times, truth, onsetIdx, offsetIdx } = sequence;
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
        data: times.map((x, i) => ({
          x,
          y: filterOutputs.student[i],
        })),
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
      data: { datasets },
      options: {
        ...baseChartOptions,
        plugins: {
          title: {
            display: true,
            text: "Arrhythmia tracking challenge (20 beats)",
          },
          annotation: undefined,
        },
        scales: {
          x: { type: "linear", title: { display: true, text: "Time (s)" } },
          y: { title: { display: true, text: "Amplitude (mV)" } },
        },
      },
      onsetTime: times[onsetIdx],
      offsetTime: times[Math.min(offsetIdx, times.length - 1)],
    };
  }, [sequence, filterOutputs]);

  const recoveryChart = useMemo(() => {
    if (!filterOutputs) return null;
    const labels = [
      "Your filter",
      ...filterOutputs.experts.map((e) => e.name),
    ];
    const values = [
      filterOutputs.studentRecovery,
      ...filterOutputs.experts.map((e) => e.recovery),
    ];
    return {
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
        ...baseChartOptions,
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

  if (!generateECG || !cleanSignal.length) {
    return (
      <p className={styles.emptyHint}>
        Generate an ECG signal to start the arrhythmia challenge.
      </p>
    );
  }

  return (
    <>
      <div className={styles.moduleHeader}>
        <h3>Arrhythmia Tracking Challenge</h3>
        <button
          type="button"
          className={styles.theoryBtn}
          onClick={() => setTheoryOpen(true)}
        >
          Theory Link
        </button>
      </div>

      <p className={styles.hintText}>
        Beats 1–8: 70 BPM · Beats 9–12: 140 BPM (tachycardia) · Beats 13–20:
        70 BPM recovery
      </p>

      <div className={styles.twoCol}>
        <div className={styles.controlsCol}>
          <KalmanSliders />
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={runStudentFilter}
          >
            Run My Filter
          </button>
        </div>
        <div className={styles.chartsCol}>
          {signalChart && (
            <div className={styles.chartBox}>
              <Line
                data={signalChart.data}
                options={{
                  ...signalChart.options,
                  plugins: {
                    ...signalChart.options.plugins,
                    verticalLines: {
                      onset: signalChart.onsetTime,
                      offset: signalChart.offsetTime,
                    },
                  },
                }}
                plugins={[
                  {
                    id: "arrhythmiaLines",
                    afterDraw(chart) {
                      const { onset, offset } =
                        chart.options.plugins?.verticalLines ?? {};
                      const xScale = chart.scales.x;
                      const yScale = chart.scales.y;
                      if (!xScale || !yScale) return;
                      const ctx = chart.ctx;
                      [onset, offset].forEach((xVal, i) => {
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
                  },
                ]}
              />
            </div>
          )}
          {recoveryChart && (
            <div className={styles.recoveryChart}>
              <Bar
                data={recoveryChart.data}
                options={recoveryChart.options}
              />
            </div>
          )}
        </div>
      </div>

      {studentRun && (
        <div className={styles.insightCard}>
          Expert A recovers fastest because large Q tells the filter to expect
          rapid signal changes. Expert B is slowest — rigid low Q assumes the
          signal is nearly constant, making it blind to sudden changes.
        </div>
      )}

      {theoryOpen && (
        <TheoryModal
          theoryKey="arrhythmia"
          onClose={() => setTheoryOpen(false)}
        />
      )}
    </>
  );
}
