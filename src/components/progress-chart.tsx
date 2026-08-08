"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartSeries {
  dataKey: string;
  label: string;
  color: string;
  unit?: string;
}

export function ProgressChart({
  data,
  series,
  emptyLabel = "Aún no hay suficientes datos para la gráfica.",
}: {
  data: object[];
  series: ChartSeries[];
  emptyLabel?: string;
}) {
  if (data.length < 2) return <div className="chart-empty">{emptyLabel}</div>;
  return (
    <div
      className="chart-container"
      aria-label={`Gráfica de ${series.map((item) => item.label).join(" y ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
        >
          <CartesianGrid
            strokeDasharray="4 5"
            stroke="#ded8c8"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6d7067" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6d7067" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "#d7d0bf",
              background: "#fffef9",
            }}
          />
          {series.map((item) => (
            <Line
              key={item.dataKey}
              type="monotone"
              dataKey={item.dataKey}
              name={item.label}
              {...(item.unit !== undefined ? { unit: item.unit } : {})}
              stroke={item.color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: item.color }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
