import * as math from "mathjs";

const { matrix, multiply, add, subtract, inv, transpose, identity } = math;

const fmt4 = (v) => (Number.isFinite(v) ? Number(v).toFixed(4) : "—");

export { fmt4 };

/**
 * Fast 2-state Kalman filter (H = [1, 0]) using scalar math.
 * Optional traces for learning modules; skip traces for arrhythmia / bulk runs.
 */
export function runKalmanFilter(
  measurements,
  dt,
  x0hat,
  P0_alpha,
  Q_diag,
  R,
  { includeTraces = true } = {}
) {
  const n = measurements.length;
  if (n === 0) {
    return {
      xFiltered: [],
      P_trace: [],
      P_pred_trace: [],
      K_trace: [],
      innovations: [],
      xStates: [],
    };
  }

  const q0 = Q_diag;
  const q1 = Q_diag * 0.1;
  const dt2 = dt * dt;

  let x0 = x0hat;
  let x1 = 0;
  let p00 = P0_alpha;
  let p01 = 0;
  let p10 = 0;
  let p11 = P0_alpha;

  const xFiltered = new Array(n);
  const P_trace = includeTraces ? new Array(n) : [];
  const P_pred_trace = includeTraces ? new Array(n) : [];
  const K_trace = includeTraces ? new Array(n) : [];
  const innovations = includeTraces ? new Array(n) : [];
  const xStates = includeTraces ? new Array(n) : [];

  for (let k = 0; k < n; k++) {
    const x0p = x0 + dt * x1;
    const x1p = x1;

    const p00p = p00 + dt * (p10 + p01) + dt2 * p11 + q0;
    const p01p = p01 + dt * p11;
    const p10p = p10 + dt * p11;
    const p11p = p11 + q1;

    const z = measurements[k];
    const innov = z - x0p;
    const S = p00p + R;
    const k0 = p00p / S;
    const k1 = p10p / S;

    x0 = x0p + k0 * innov;
    x1 = x1p + k1 * innov;

    const sk0 = S * k0;
    const sk1 = S * k1;
    p00 = p00p - k0 * sk0;
    p01 = p01p - k0 * sk1;
    p10 = p10p - k1 * sk0;
    p11 = p11p - k1 * sk1;

    xFiltered[k] = x0;
    if (includeTraces) {
      P_pred_trace[k] = p00p;
      P_trace[k] = p00;
      K_trace[k] = k0;
      innovations[k] = innov;
      xStates[k] = [x0, x1];
    }
  }

  return {
    xFiltered,
    P_trace,
    P_pred_trace,
    K_trace,
    innovations,
    xStates,
  };
}

/** Steady-state P[0,0] via DARE (math.js, 500 iterations). */
export function solveDARE_iterative(F, H, Q, R, maxIter = 500) {
  let P = identity(2);
  const Rm = matrix([[R]]);

  for (let i = 0; i < maxIter; i++) {
    const HP = multiply(H, P);
    const S = add(multiply(HP, transpose(H)), Rm);
    const FPHt = multiply(multiply(F, P), transpose(H));
    const term = multiply(multiply(FPHt, inv(S)), multiply(H, P));
    P = add(subtract(multiply(multiply(F, P), transpose(F)), term), Q);
  }

  return P.get([0, 0]);
}

export function solvePInfinity(dt, Q_diag, R, maxIter = 500) {
  const F = matrix([
    [1, dt],
    [0, 1],
  ]);
  const H = matrix([[1, 0]]);
  const Q = matrix([
    [Q_diag, 0],
    [0, Q_diag * 0.1],
  ]);
  return solveDARE_iterative(F, H, Q, R, maxIter);
}

export function computeRMSE(estimated, truth, startIdx, endIdx) {
  const start = Math.max(0, startIdx);
  const end = Math.min(estimated.length, truth.length, endIdx);
  if (end <= start) return 0;
  let sum = 0;
  let count = 0;
  for (let i = start; i < end; i++) {
    const e = estimated[i] - truth[i];
    sum += e * e;
    count++;
  }
  return count > 0 ? Math.sqrt(sum / count) : 0;
}

export function computeTransientLength(P_trace, P_infinity, threshold = 0.05) {
  if (!P_trace.length || !Number.isFinite(P_infinity) || P_infinity <= 0) {
    return P_trace.length;
  }
  for (let k = 0; k < P_trace.length; k++) {
    if (Math.abs(P_trace[k] - P_infinity) / P_infinity < threshold) {
      return k;
    }
  }
  return P_trace.length;
}

export function convergenceBadge(transientLen) {
  if (transientLen < 20) return { label: "Fast", color: "#639922" };
  if (transientLen <= 100) return { label: "Medium", color: "#BA7517" };
  return { label: "Slow", color: "#E24B4A" };
}

export function p0ConfidenceLabel(alpha) {
  if (alpha < 0.1) return "High confidence in x̂₀ (dangerous if wrong)";
  if (alpha <= 10) return "Moderate uncertainty";
  return "Low confidence — filter will trust measurements quickly";
}

export function x0ColorIndicator(x0hat, trueFirst) {
  const diff = Math.abs(x0hat - trueFirst);
  if (diff < 0.1) return "#639922";
  if (diff < 0.5) return "#BA7517";
  return "#E24B4A";
}

export function buildFMatrix(dt) {
  return [
    [1, dt],
    [0, 1],
  ];
}

export function predictStep(x0, x1, dt) {
  return [x0 + dt * x1, x1];
}

export function kalmanGainScalar(P_pred_00, R) {
  return P_pred_00 / (P_pred_00 + R);
}

export function samplesToRelock(filtered, truth, onsetIdx, tolerance = 0.1) {
  for (let i = onsetIdx; i < filtered.length; i++) {
    if (Math.abs(filtered[i] - truth[i]) < tolerance) {
      return i - onsetIdx;
    }
  }
  return filtered.length - onsetIdx;
}
