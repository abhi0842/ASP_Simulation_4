/**
 * 20-beat arrhythmia sequence (standalone — does not modify CSV / generation pipeline).
 */

function resampleBeat(beat, targetLen) {
  if (targetLen <= 0) return [];
  if (beat.length === targetLen) return [...beat];
  const out = [];
  for (let i = 0; i < targetLen; i++) {
    const src = (i / targetLen) * beat.length;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, beat.length - 1);
    const frac = src - i0;
    out.push(beat[i0] * (1 - frac) + beat[i1] * frac);
  }
  return out;
}

export function extractBeatTemplate(cleanSignal, fs, beatDurationSec = 0.85) {
  const len = Math.min(
    Math.floor(beatDurationSec * fs),
    Math.max(32, Math.floor(cleanSignal.length / 4))
  );
  return cleanSignal.slice(0, len);
}

export function generateArrhythmiaSequence(templateBeat, fs) {
  const segments = [
    { count: 8, bpm: 70 },
    { count: 4, bpm: 140 },
    { count: 8, bpm: 70 },
  ];

  const truth = [];
  const times = [];
  let t = 0;
  let beatIndex = 0;
  let onsetIdx = null;
  let offsetIdx = null;

  for (const seg of segments) {
    const period = 60 / seg.bpm;
    const beatSamples = Math.max(8, Math.round(period * fs));

    for (let b = 0; b < seg.count; b++) {
      if (beatIndex === 8) onsetIdx = truth.length;
      if (beatIndex === 12) offsetIdx = truth.length;

      const beat = resampleBeat(templateBeat, beatSamples);
      for (let i = 0; i < beat.length; i++) {
        times.push(t + i / fs);
        truth.push(beat[i]);
      }
      t += period;
      beatIndex++;
    }
  }

  return { times, truth, onsetIdx: onsetIdx ?? 0, offsetIdx: offsetIdx ?? truth.length };
}

export function addGaussianNoise(signal, R) {
  const amp = Math.sqrt(R) * 2;
  return signal.map((y) => y + (Math.random() - 0.5) * 2 * amp);
}
