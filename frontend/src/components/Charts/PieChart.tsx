import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ["#7c3aed", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const PieChart = ({
  data,
  dataKey = "value",
}: any) => {
  const total = data.reduce((a: number, b: any) => a + b[dataKey], 0);
  const format = new Intl.NumberFormat();

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full h-full max-w-sm">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey={dataKey}
              label={({ percent }: { percent?: number }) => `${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(val, name) => [
                `${format.format(val as number)} (${(
                  ((val as number) / total) *
                  100
                ).toFixed(1)}%)`,
                name,
              ]}
              contentStyle={{
                background: "white",
                border: "1px solid #eee",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                fontSize: "12px",
                fontWeight: "500",
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieChart;
