import {
  matrix,
  multiply,
  add,
  subtract,
  inv,
  transpose,
  identity,
} from "mathjs";

const fmt4 = (v) => (Number.isFinite(v) ? Number(v).toFixed(4) : "—");

export { fmt4 };

/**
 * Kalman filter: state [amplitude, slope], H = [1, 0].
 */
export function runKalmanFilter(measurements, dt, x0hat, P0_alpha, Q_diag, R) {
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

  const F = matrix([
    [1, dt],
    [0, 1],
  ]);
  const H = matrix([[1, 0]]);
  const Q = matrix([
    [Q_diag, 0],
    [0, Q_diag * 0.1],
  ]);
  const P0 = multiply(P0_alpha, identity(2));
  const Rm = matrix([[R]]);

  const xFiltered = [];
  const P_trace = [];
  const P_pred_trace = [];
  const K_trace = [];
  const innovations = [];
  const xStates = [];

  let xHat = matrix([[x0hat], [0]]);
  let P = P0;

  for (let k = 0; k < n; k++) {
    const z = matrix([[measurements[k]]]);

    const xPred = multiply(F, xHat);
    const PPred = add(multiply(multiply(F, P), transpose(F)), Q);

    P_pred_trace.push(PPred.get([0, 0]));

    const innov = subtract(z, multiply(H, xPred));
    const S = add(multiply(multiply(H, PPred), transpose(H)), Rm);
    const K = multiply(multiply(PPred, transpose(H)), inv(S));

    xHat = add(xPred, multiply(K, innov));
    const I = identity(2);
    P = multiply(subtract(I, multiply(K, H)), PPred);

    const amp = xHat.get([0, 0]);
    const slope = xHat.get([1, 0]);
    xFiltered.push(amp);
    xStates.push([amp, slope]);
    P_trace.push(P.get([0, 0]));
    K_trace.push(K.get([0, 0]));
    innovations.push(innov.get([0, 0]));
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

/**
 * Steady-state covariance via iterative DARE recursion.
 */
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
