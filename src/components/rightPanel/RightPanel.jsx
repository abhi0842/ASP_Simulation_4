import { useContext, useState, useEffect } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";
import Swal from "sweetalert2";

export const RightPanel = () => {
  const {
    time,
    setTime,
    originalFs,
    // setUserFs,
    setGenerateECG,
    setApplyNoiseTrigger,
    config,
    setConfig,
    setFilteredECG,
    noise,
    setNoise,
    csvFilePath,
    prevPathRef,
    setCsvFilePath,
    generateECG,
    setApplypsdTrigger,
    setFilteredSamples,
  } = useContext(SimulationContext);

  const [adaptiveAlgo, setAdaptiveAlgo] = useState(config.filterType ?? "NLMS");
  const [filterOrder, setFilterOrder] = useState(config.filterOrder ?? 32);
  const [stepSize, setStepSize] = useState(config.stepSize ?? 0.1);
  const [forgettingFactor, setForgettingFactor] = useState(config.forgettingFactor ?? 0.99);
  const [regularization, setRegularization] = useState(config.regularization ?? 0.01);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const runPsd = () => {
    if (!generateECG) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please generate ECG signal first!",
      });
      return;
    }
    setApplypsdTrigger(true);
  };
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : base + "/";
  const assetPath = (name) => normalizedBase + name;
  const runFilter = () => {
    if (!generateECG) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please generate ECG signal first!",
      });
      return;
    }

    const sanitizedOrder = clamp(Math.floor(Number(filterOrder) || 1), 1, 256);
     // sanitize step size depending on algorithm (LMS can accept much smaller mu)
    const sanitizedMu = adaptiveAlgo === "LMS"
      ? clamp(Number(stepSize) || 0.01, 1e-8, 1)
      : clamp(Number(stepSize) || 0.1, 0.01, 0.2);
    const sanitizedLambda = clamp(Number(forgettingFactor) || 0.99, 0.9, 0.999999);
    const sanitizedDelta = clamp(Number(regularization) || 0.01, 1e-12, 1);

    // reflect sanitized values back into UI controls
    setFilterOrder(sanitizedOrder);
     if (adaptiveAlgo === "LMS") setStepSize(sanitizedMu);
    else setStepSize(Math.round(sanitizedMu * 100) / 100);
    setForgettingFactor(Math.round(sanitizedLambda * 1e6) / 1e6);
    setRegularization(Number(sanitizedDelta));

    const newConfig = {
      ...config,
      filterType: adaptiveAlgo,
      filterOrder: sanitizedOrder,
      stepSize: sanitizedMu,
      forgettingFactor: sanitizedLambda,
      regularization: sanitizedDelta,
    };
    setConfig(newConfig);
    setFilteredECG(true);
  };
  const noiseTrigger = () => {
    //console.log(noise);
    if (!generateECG) {
      Swal.fire({
        icon: "info",
        title: "Oops...",
        text: "Please generate ECG signal first!",
      });
      return;
    } else if (!noise.baseline && !noise.powerline && !noise.emg) {
      Swal.fire({
        icon: "info",

        title: "Oops...",
        text: "Please select at least one noise type!",
      });
      return;
    } else {
      setApplyNoiseTrigger(true);
    }
  };
  useEffect(() => {
    if (prevPathRef.current !== csvFilePath) {
      setApplyNoiseTrigger(false);
      setFilteredECG(false);
      setApplypsdTrigger(false);
      setFilteredSamples([]);
      prevPathRef.current = csvFilePath;
    }
  }, [csvFilePath, prevPathRef, setApplyNoiseTrigger, setFilteredECG, setApplypsdTrigger, setFilteredSamples]); 

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        <h2>ECG Signal & Filter Controls</h2>

        <div className={styles.box}>
          <h3>Signal Setup</h3>
          <label>Select ECG Dataset</label>
          <select value={csvFilePath} onChange={(e) => setCsvFilePath(e.target.value)}>
            <option value={assetPath("ecg200.csv")}>ECG Dataset 1</option>
            <option value={assetPath("ecg300.csv")}>ECG Dataset 2</option>
            <option value={assetPath("ecg100.csv")}>ECG Dataset 3</option>
          </select>

          <label>Duration (seconds)           <p className={styles.rangeValue}>
            : <span id="demo">{time} seconds</span>
          </p> </label>
          <input
            type="range"
            min="1"
            max="50"
            value={time}
            onChange={(e) => setTime(Number(e.target.value))}
          />

          <label>
            Sampling Rate : <span id="demo">{originalFs} Hz</span>
          </label>
          {/* <input
            type="range"
            min="1"
            max="1000"
            value={originalFs}
            onChange={(e) => setUserFs(Number(e.target.value))}
          /> */}
          <p className={styles.rangeValue}>
            
          </p>

          <button onClick={() => setGenerateECG(true)}>
            Generate ECG Signal
          </button>
        </div>

        <div className={styles.box}>
          <h3>Add Noise</h3>

          <label>
            <input
              type="checkbox"
              checked={noise.baseline}
              onChange={(e) =>
                setNoise({ ...noise, baseline: e.target.checked })
              }
            />
            Baseline Wander
          </label>

          <label>
            <input
              type="checkbox"
              checked={noise.powerline}
              onChange={(e) =>
                setNoise({ ...noise, powerline: e.target.checked })
              }
            />
            Powerline (50 Hz)
          </label>

          <label>
            <input
              type="checkbox"
              checked={noise.emg}
              onChange={(e) => setNoise({ ...noise, emg: e.target.checked })}
            />
            EMG Noise
          </label>
          <div className={styles.buttonContainer}>
            <button onClick={() => noiseTrigger()}>Add Noise to Signal</button>
          </div>
        </div>
        {/* adaptive filter input */}
        <div className={styles.box}>
          <h3>Adaptive Filter (NLMS / LMS/ RLS)</h3>

          <label>Algorithm</label>
          <select value={adaptiveAlgo} onChange={(e) => setAdaptiveAlgo(e.target.value)}>
            <option value="NLMS">NLMS</option>
            <option value="LMS">LMS</option>
            <option value="RLS">RLS</option>
          </select>

          <label>Filter Order (M)</label>
          <input
            type="number"
            min="1"
            max="256"
            step="1"
            value={filterOrder}
            onChange={(e) => setFilterOrder(Number(e.target.value))}
            onBlur={() => setFilterOrder((o) => clamp(Math.floor(Number(o) || 1), 1, 256))}
          />

           {(adaptiveAlgo === "NLMS" || adaptiveAlgo === "LMS") && (
            <>
               <label>Step size μ {adaptiveAlgo === "LMS" ? "(LMS — small values recommended)" : "(0.01 to 0.2)"}</label>
              <input
                type="number"
                min={adaptiveAlgo === "LMS" ? "1e-8" : "0.01"}
                max={adaptiveAlgo === "LMS" ? "1" : "0.2"}
                step={adaptiveAlgo === "LMS" ? "0.0001" : "0.01"}
                value={stepSize}
                onChange={(e) => setStepSize(Number(e.target.value))}
                onBlur={() => setStepSize((s) => {
                  const raw = Number(s);
                  if (adaptiveAlgo === "LMS") {
                    const v = clamp(raw || 0.01, 1e-8, 1);
                    return v;
                  }
                  const v = clamp(raw || 0.01, 0.01, 0.2);
                  return Math.round(v * 100) / 100;
                })}
              />
            </>
          )}

          {adaptiveAlgo === "RLS" && (
            <>
              <label>Forgetting factor λ (0.90 to 0.999999)</label>
              <input
                type="number"
                min="0.9"
                max="0.999999"
                step="0.0001"
                value={forgettingFactor}
                onChange={(e) => setForgettingFactor(Number(e.target.value))}
                onBlur={() => setForgettingFactor((v) => {
                  const out = clamp(Number(v) || 0.99, 0.9, 0.999999);
                  return Math.round(out * 1e6) / 1e6;
                })}
              />

              <label>Regularization δ (1e-12 to 1)</label>
              <input
                type="number"
                min="1e-12"
                max="1"
                step="0.0001"
                value={regularization}
                onChange={(e) => setRegularization(Number(e.target.value))}
                onBlur={() => setRegularization((v) => {
                  const out = clamp(Number(v) || 0.01, 1e-12, 1);
                  return Number(out);
                })}
              />
            </>
          )}

          <div className={styles.psdContainer}>
            <button onClick={runFilter}>Apply Filter</button>
            <button onClick={runPsd}>Compute PSD</button>
          </div>
        </div>
      </div>
    </div>
  );
};
