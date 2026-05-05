"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface DataPoint {
  date: string
  weight: number
}

interface WeightChartProps {
  data: DataPoint[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-d5-surface border border-d5-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-d5-muted text-xs">{label}</p>
      <p className="text-white font-bold text-sm mt-0.5">{payload[0].value.toFixed(1)} kg</p>
    </div>
  )
}

export function WeightChart({ data }: WeightChartProps) {
  const values = data.map((d) => d.weight)
  const minVal = Math.floor(Math.min(...values) - 2)
  const maxVal = Math.ceil(Math.max(...values) + 2)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6B7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[minVal, maxVal]}
          tick={{ fill: "#6B7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#C9A84C"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#C9A84C", stroke: "#0D0D0D", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#C9A84C", stroke: "#0D0D0D", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
