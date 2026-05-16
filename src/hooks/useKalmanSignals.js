import { useContext, useMemo } from "react";
import { SimulationContext } from "../context/SimulationContext";
import { getAlignedKalmanSignals } from "../utils/signalAlign";
import { runKalmanFilter, solvePInfinity } from "../utils/kalman";

export function useKalmanSignals(overrideParams = null) {
  const {
    rawSamples,
    cleanSignal,
    noisySamples,
    originalFs,
    time,
    applyNoiseTrigger,
    kalmanParams,
  } = useContext(SimulationContext);

  const params = overrideParams ?? kalmanParams;
  const dt = 1 / originalFs;

  const aligned = useMemo(
    () =>
      getAlignedKalmanSignals({
        rawSamples,
        cleanSignal,
        noisySamples,
        originalFs,
        time,
        applyNoiseTrigger,
      }),
    [
      rawSamples,
      cleanSignal,
      noisySamples,
      originalFs,
      time,
      applyNoiseTrigger,
    ]
  );

  const filterResult = useMemo(() => {
    if (!aligned.hasData) return null;
    const result = runKalmanFilter(
      aligned.measurements,
      dt,
      params.x0hat,
      params.P0_alpha,
      params.Q_diag,
      params.R
    );
    const P_inf = solvePInfinity(dt, params.Q_diag, params.R);
    return { ...result, P_inf, dt };
  }, [aligned, dt, params]);

  return { aligned, filterResult, params, dt, fs: originalFs };
}
