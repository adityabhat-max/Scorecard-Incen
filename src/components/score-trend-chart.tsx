"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  period: string;
  score: number;
}

export function ScoreTrendChart({ data }: { data: Point[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.period).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="label"
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-foreground)" }}
            formatter={(value) => [`${value}/100`, "Score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--color-chart-1)", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
