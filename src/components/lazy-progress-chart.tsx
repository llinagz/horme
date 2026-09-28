"use client";

import dynamic from "next/dynamic";

/** Recharts pesa: se carga solo en las pantallas que muestran gráficas. */
export const LazyProgressChart = dynamic(
  () => import("./progress-chart").then((module) => module.ProgressChart),
  {
    ssr: false,
    loading: () => <div className="chart-canvas" aria-hidden="true" />,
  },
) as typeof import("./progress-chart").ProgressChart;
