import { useChartJs } from "../../hooks/useChartJs";
import styles from "./kalman.module.css";

export function ChartCanvas({ buildConfig, deps, className = styles.chartBox }) {
  const { canvasRef } = useChartJs(buildConfig, deps);
  return (
    <div className={className}>
      <canvas ref={canvasRef} />
    </div>
  );
}
