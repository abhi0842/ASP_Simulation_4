/** Mirrors EcgNoisy / EcgUnfilter resampling — does not modify signal generation. */

export function inferFs(dataAll) {
  if (dataAll.length < 2) return 500;
  const dt = dataAll[1].x - dataAll[0].x;
  if (dt > 0) return 1 / dt;
  return 500;
}

export function resampleForDisplay(data, fsOriginal, fsUser) {
  const step = fsOriginal / fsUser;
  if (step <= 1) return data;
  const out = [];
  for (let i = 0; i < data.length; i += step) {
    out.push(data[Math.floor(i)]);
  }
  return out;
}

/**
 * Align clean truth with display-window samples (same indexing as noisy chart).
 */
export function getAlignedKalmanSignals({
  rawSamples,
  cleanSignal,
  noisySamples,
  originalFs,
  time,
  applyNoiseTrigger,
}) {
  if (!rawSamples.length || !cleanSignal.length) {
    return { times: [], truth: [], measurements: [], hasData: false };
  }

  const fsOriginal = inferFs(rawSamples);
  const displayData = resampleForDisplay(rawSamples, fsOriginal, originalFs);
  const limited = displayData.filter((p) => p.x <= time);

  const indices = [];
  const step = fsOriginal / originalFs;
  for (let i = 0; i < limited.length; i++) {
    const srcIdx = step <= 1 ? i : Math.floor(i * step);
    indices.push(Math.min(srcIdx, cleanSignal.length - 1));
  }

  const times = limited.map((p) => p.x);
  const truth = indices.map((idx) => cleanSignal[idx]);

  let measurements = truth;
  if (applyNoiseTrigger && noisySamples.length) {
    const noisyMap = new Map(noisySamples.map((p) => [p.x, p.y]));
    measurements = times.map((t, i) => {
      const y = noisyMap.get(t);
      return Number.isFinite(y) ? y : limited[i]?.y ?? truth[i];
    });
  } else {
    measurements = limited.map((p) => p.y);
  }

  return {
    times,
    truth,
    measurements,
    hasData: times.length > 0,
    dt: 1 / originalFs,
    trueFirstSample: truth[0] ?? 0,
  };
}
