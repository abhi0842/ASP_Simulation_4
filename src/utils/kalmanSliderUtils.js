const LOG_P0_MIN = Math.log10(0.001);
const LOG_P0_MAX = Math.log10(1000);

export function alphaToSlider(alpha) {
  const log = Math.log10(Math.max(0.001, Math.min(1000, alpha)));
  return ((log - LOG_P0_MIN) / (LOG_P0_MAX - LOG_P0_MIN)) * 100;
}

export function sliderToAlpha(sliderVal) {
  const log =
    LOG_P0_MIN + (Number(sliderVal) / 100) * (LOG_P0_MAX - LOG_P0_MIN);
  return Math.pow(10, log);
}
