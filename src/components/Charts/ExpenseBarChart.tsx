import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#7c3aed", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"];

const ExpenseBarChart = ({
  data,
  height = 400,
}: {
  data: any[];
  height?: number;
}) => {
  const format = new Intl.NumberFormat();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-600" />
          
          <XAxis 
            type="number"
            stroke="#6b7280"
            className="dark:stroke-gray-400"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          
          <YAxis 
            type="category"
            dataKey="name"
            stroke="#6b7280"
            className="dark:stroke-gray-400"
            fontSize={12}
            width={70}
          />
          
          <Tooltip
            formatter={(val: number, name: string) => [
              `$${format.format(val)} (${((val / total) * 100).toFixed(1)}%)`,
              name
            ]}
            contentStyle={{
              background: "white",
              border: "1px solid #eee",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              fontSize: "12px",
              fontWeight: "500",
            }}
            className="dark:bg-gray-800 dark:border-gray-600"
          />
          
          <Bar 
            dataKey="value" 
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseBarChart;
