import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ["#7c3aed", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"];

const ExpenseDonut = ({
  data,
}: {
  data: any[];
}) => {
  const format = new Intl.NumberFormat();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topCategory = data.reduce((max, item) => item.value > max.value ? item : max, data[0]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="40%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>

          <Tooltip
            formatter={(val: number, name: string) => [
              `$${format.format(val)} (${((val / total) * 100).toFixed(1)}%)`,
              name
            ]}
            contentStyle={{
              background: "white",
              border: "1px solid #eee",
              borderRadius: "12px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
              fontSize: "12px",
              fontWeight: "500",
              padding: "8px 12px",
            }}
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          />


          
          {/* Center Text - Removed due to TypeScript issues */}
        </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Custom Legend */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          return (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {format.format(item.value)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary Section */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[data.indexOf(topCategory) % COLORS.length] }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              Largest expense: <span className="font-medium text-gray-900 dark:text-gray-100">{topCategory.name}</span>
            </span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">
            {((topCategory.value / total) * 100).toFixed(1)}% of total
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDonut;
