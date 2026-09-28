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
import { formatNumber, formatShortDate } from "@/domain/format";

export interface ChartSeries<T> {
  dataKey: keyof T & string;
  label: string;
  tone: "olive" | "bronze" | "ink";
  unit?: string;
}

/**
 * Evolución en el tiempo. Los colores salen de los tokens por CSS, así que la
 * gráfica sigue al tema; debajo hay una tabla para lectores de pantalla.
 */
export function ProgressChart<T extends { date: string }>({
  data,
  series,
  title,
  emptyLabel = "Aparecerá cuando haya al menos dos registros.",
}: {
  data: T[];
  series: Array<ChartSeries<T>>;
  title: string;
  emptyLabel?: string;
}) {
  if (data.length < 2) return <p className="chart-empty">{emptyLabel}</p>;
  const format = (value: unknown) =>
    typeof value === "number" ? formatNumber(Math.round(value * 10) / 10) : "—";
  return (
    <figure className="chart">
      <div className="chart-canvas" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
          >
            <CartesianGrid vertical={false} className="chart-grid" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatShortDate(value)}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => formatNumber(value)}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(value) => formatShortDate(String(value))}
              formatter={(value, name) => [format(value), name]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--veta)",
                background: "var(--marmol-alto)",
                color: "var(--tinta)",
              }}
            />
            {series.map((item) => (
              <Line
                key={item.dataKey}
                className={`series-${item.tone}`}
                type="monotone"
                dataKey={item.dataKey}
                name={item.label}
                {...(item.unit !== undefined ? { unit: ` ${item.unit}` } : {})}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            {series.map((item) => (
              <th scope="col" key={item.dataKey}>
                {item.label}
                {item.unit ? ` (${item.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={`${row.date}-${index}`}>
              <th scope="row">{formatShortDate(row.date)}</th>
              {series.map((item) => (
                <td key={item.dataKey}>{format(row[item.dataKey])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {series.length > 1 ? (
        <figcaption className="chart-legend">
          {series.map((item) => (
            <span key={item.dataKey} className={`legend-${item.tone}`}>
              {item.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
