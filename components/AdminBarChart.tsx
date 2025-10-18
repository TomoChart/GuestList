"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GuestBreakdownEntry } from "../types/Guest";

interface AdminBarChartProps {
  title: string;
  data: GuestBreakdownEntry[];
}

export default function AdminBarChart({ title, data }: AdminBarChartProps) {
  return (
    <div className="h-[360px] w-full rounded-2xl border border-white/40 bg-white/10 p-4 shadow-inner backdrop-blur-md">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#ffffff" tick={{ fill: "#ffffff", fontSize: 12 }} interval={0} angle={-20} dy={10} height={70} />
          <YAxis stroke="#ffffff" tick={{ fill: "#ffffff", fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{ background: "rgba(255,255,255,0.9)", borderRadius: 12, border: "none" }}
          />
          <Legend wrapperStyle={{ color: "white" }} />
          <Bar dataKey="invited" fill="rgba(255,255,255,0.7)" radius={[6, 6, 0, 0]} name="Pozvano" />
          <Bar dataKey="arrived" fill="rgba(0,255,200,0.8)" radius={[6, 6, 0, 0]} name="Pristiglo" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
