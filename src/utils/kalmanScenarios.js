export function getScenarioPreset(key, trueFirstSample) {
  const presets = {
    A: { x0hat: trueFirstSample, P0_alpha: 0.01 },
    B: { x0hat: -1.0, P0_alpha: 0.01 },
    C: { x0hat: -1.0, P0_alpha: 50.0 },
    D: { x0hat: 0.0, P0_alpha: 1000 },
  };
  return presets[key];
}

export const SCENARIO_MESSAGES = {
  A: {
    text: "Fast and accurate from step 1. Risk: slow to adapt if signal drifts.",
    tone: "green",
  },
  B: {
    text: "Slow convergence — persistent bias early on. Most dangerous configuration.",
    tone: "red",
  },
  C: {
    text: "Fast convergence despite wrong guess. Large P₀ forces the filter to trust measurements.",
    tone: "yellow",
  },
  D: {
    text: "First estimate = pure measurement. Safe but noisy initial estimates.",
    tone: "blue",
  },
};

export function estimateRFromNoise(noise) {
  const count = [noise.baseline, noise.powerline, noise.emg].filter(Boolean).length;
  if (count === 0) return 0.01;
  return Math.min(1, Math.max(0.001, 0.005 + count * 0.012));
}
