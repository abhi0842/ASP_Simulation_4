import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

/**
 * Creates/destroys a Chart.js instance on a canvas ref when deps change.
 */
export function useChartJs(buildConfig, deps) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const config = buildConfig();
    if (!config) return undefined;

    chartInstanceRef.current = new Chart(canvas, config);

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { canvasRef, chartInstanceRef };
}
