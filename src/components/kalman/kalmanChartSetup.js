import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  LogarithmicScale,
  CategoryScale,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

let registered = false;

export function registerKalmanCharts() {
  if (registered) return;
  ChartJS.register(
    LineElement,
    PointElement,
    LinearScale,
    LogarithmicScale,
    CategoryScale,
    BarElement,
    Tooltip,
    Legend,
    Filler
  );
  registered = true;
}

export const COLORS = {
  teal: "#1D9E75",
  coral: "#D85A30",
  blue: "#378ADD",
  purple: "#7F77DD",
  amber: "#BA7517",
  green: "#639922",
  red: "#E24B4A",
  gray: "#888780",
};

export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  parsing: false,
  plugins: {
    legend: {
      labels: { boxWidth: 12, font: { size: 11 } },
    },
  },
};
