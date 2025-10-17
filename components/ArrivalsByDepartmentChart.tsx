import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ArrivalsByDepartmentChartProps {
  data: { department: string; arrived: number }[];
}

const ArrivalsByDepartmentChart: React.FC<ArrivalsByDepartmentChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="department" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={80} />
        <YAxis allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(59,130,246,0.1)' }} />
        <Bar dataKey="arrived" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ArrivalsByDepartmentChart;
