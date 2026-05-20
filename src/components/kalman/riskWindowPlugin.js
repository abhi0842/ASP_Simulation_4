/** Shades the early transient zone when P₀ < 1 (clinical risk window). */
export function createRiskWindowPlugin(times, P_trace, P_inf, enabled) {
  return {
    id: "riskWindow",
    beforeDatasetsDraw(chart) {
      if (!enabled || !times?.length || !P_trace?.length || !Number.isFinite(P_inf)) {
        return;
      }
      const threshold = 1.05 * P_inf;
      let endIdx = -1;
      for (let i = 0; i < P_trace.length; i++) {
        if (P_trace[i] > threshold) endIdx = i;
        else break;
      }
      if (endIdx < 0) return;

      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;

      const x0 = times[0];
      const x1 = times[Math.min(endIdx, times.length - 1)];
      const px0 = xScale.getPixelForValue(x0);
      const px1 = xScale.getPixelForValue(x1);

      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(226, 75, 74, 0.12)";
      ctx.fillRect(
        Math.min(px0, px1),
        yScale.top,
        Math.abs(px1 - px0),
        yScale.bottom - yScale.top
      );
      ctx.restore();
    },
    afterDraw(chart) {
      if (!enabled || !times?.length || !P_trace?.length || !Number.isFinite(P_inf)) {
        return;
      }
      const threshold = 1.05 * P_inf;
      let endIdx = -1;
      for (let i = 0; i < P_trace.length; i++) {
        if (P_trace[i] > threshold) endIdx = i;
        else break;
      }
      if (endIdx < 0) return;

      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;

      const midX =
        (xScale.getPixelForValue(times[0]) +
          xScale.getPixelForValue(times[Math.min(endIdx, times.length - 1)])) /
        2;

      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = "#E24B4A";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Risk window: filter not yet converged",
        midX,
        yScale.top + 14
      );
      ctx.restore();
    },
  };
}
