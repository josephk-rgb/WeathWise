const COLORS = ["#7c3aed", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"];

const ExpenseList = ({
  data,
}: {
  data: any[];
}) => {
  const format = new Intl.NumberFormat();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  console.log('🔍 [ExpenseList DEBUG] Data received:', data);
  console.log('🔍 [ExpenseList DEBUG] Total amount:', total);
  console.log('🔍 [ExpenseList DEBUG] Number of categories:', data.length);

  return (
  <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        console.log(`🔍 [ExpenseList DEBUG] Rendering category ${index + 1}:`, item.name, item.value, `${percentage.toFixed(1)}%`);
        return (
          <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate">
                  {item.name}
                </span>
              </div>
              <div className="text-right flex-shrink-0 ml-1">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {format.format(item.value)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
              <div 
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: COLORS[index % COLORS.length]
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExpenseList;
