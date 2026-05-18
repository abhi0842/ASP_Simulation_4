/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useRef, useState } from "react";

export const SimulationContext = createContext();

export const SimulationProvider = ({ children }) => {
  const [time, setTime] = useState(5);
  const [originalFs, setOriginalFs] = useState(500);

  const [rawSamples, setRawSamples] = useState([]);
  const [noisySamples, setNoisySamples] = useState([]);
  const [cleanSignal, setCleanSignal] = useState([]);

  const [generateECG, setGenerateECG] = useState(false);
  const [applyNoiseTrigger, setApplyNoiseTrigger] = useState(false);
  const [applypsdTrigger, setApplypsdTrigger] = useState(false);

  const [noise, setNoise] = useState({
    baseline: false,
    powerline: false,
    emg: false,
  });

  const [csvFilePath, setCsvFilePath] = useState(() => {
    const base = import.meta.env.BASE_URL || "/";
    const normalizedBase = base.endsWith("/") ? base : base + "/";
    return normalizedBase + "ecg200.csv";
  });
  const prevPathRef = useRef(csvFilePath);

  const [showInstruction, setShowInstruction] = useState(false);
  const buttonRef = useRef(null);

  const [kalmanParams, setKalmanParams] = useState({
    x0hat: 0,
    P0_alpha: 1,
    Q_diag: 0.001,
    R: 0.01,
    fsKalman: 500,
  });
  const [lastKalmanSlider, setLastKalmanSlider] = useState("R");

  const parseCsvECG = useCallback((text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return null;

    const header = lines[0].split(",").map((h) => h.trim());
    const timeIdx = header.findIndex((h) => h === "time_sec" || h.startsWith("time_sec"));
    const rawIdx = header.findIndex((h) => h === "ECG_I" || h.includes("ECG_I"));
    const cleanIdx = header.findIndex(
      (h) => h === "ECG_I_filtered" || h.includes("ECG_I_filtered")
    );

    const resolvedTimeIdx = timeIdx >= 0 ? timeIdx : 0;
    const resolvedRawIdx = rawIdx >= 0 ? rawIdx : 1;
    const resolvedCleanIdx = cleanIdx >= 0 ? cleanIdx : 2;

    const points = [];
    const clean = [];
    const times = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const t = Number.parseFloat(cols[resolvedTimeIdx]);
      const raw = Number.parseFloat(cols[resolvedRawIdx]);
      const ref = Number.parseFloat(cols[resolvedCleanIdx]);
      if (!Number.isFinite(t) || !Number.isFinite(raw) || !Number.isFinite(ref)) continue;
      points.push({ x: t, y: raw });
      clean.push(ref);
      times.push(t);
    }

    if (points.length < 2) return null;

    let dtSum = 0;
    let dtCount = 0;
    for (let i = 1; i < Math.min(times.length, 200); i++) {
      const dt = times[i] - times[i - 1];
      if (dt > 0 && Number.isFinite(dt)) {
        dtSum += dt;
        dtCount++;
      }
    }
    const fs = dtCount > 0 ? 1 / (dtSum / dtCount) : 500;

    return { points, clean, fs };
  }, []);

  const loadECGFromCsv = useCallback(async () => {
    try {
      setRawSamples([]);
      setNoisySamples([]);
      setCleanSignal([]);

      const res = await fetch(csvFilePath);
      if (!res.ok) throw new Error(`Failed to load ECG CSV: ${res.status}`);
      const text = await res.text();
      const parsed = parseCsvECG(text);
      if (!parsed) throw new Error("CSV parse failed (no usable rows).");

      setRawSamples(parsed.points);
      setCleanSignal(parsed.clean);
      setOriginalFs(parsed.fs);

      setApplyNoiseTrigger(false);
      setApplypsdTrigger(false);
    } catch {
      /* load failed — UI shows empty state */
    }
  }, [csvFilePath, parseCsvECG]);

  useEffect(() => {
    if (!generateECG) return;
    loadECGFromCsv();
  }, [generateECG, loadECGFromCsv]);

  useEffect(() => {
    setKalmanParams((p) => ({ ...p, fsKalman: originalFs }));
  }, [originalFs]);

  return (
    <SimulationContext.Provider
      value={{
        time,
        setTime,
        originalFs,
        setOriginalFs,
        rawSamples,
        setRawSamples,
        noisySamples,
        setNoisySamples,
        cleanSignal,
        setCleanSignal,
        generateECG,
        setGenerateECG,
        applyNoiseTrigger,
        setApplyNoiseTrigger,
        applypsdTrigger,
        setApplypsdTrigger,
        noise,
        setNoise,
        csvFilePath,
        setCsvFilePath,
        prevPathRef,
        showInstruction,
        setShowInstruction,
        buttonRef,
        kalmanParams,
        setKalmanParams,
        lastKalmanSlider,
        setLastKalmanSlider,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};
