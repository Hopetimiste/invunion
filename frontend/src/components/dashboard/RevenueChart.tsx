import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const data = [
  { month: "Jan", revenue: 4200, orders: 180 },
  { month: "Feb", revenue: 3800, orders: 165 },
  { month: "Mar", revenue: 5100, orders: 220 },
  { month: "Apr", revenue: 4900, orders: 205 },
  { month: "May", revenue: 6200, orders: 280 },
  { month: "Jun", revenue: 5800, orders: 260 },
  { month: "Jul", revenue: 7100, orders: 310 },
  { month: "Aug", revenue: 6800, orders: 295 },
  { month: "Sep", revenue: 7900, orders: 340 },
  { month: "Oct", revenue: 8200, orders: 360 },
  { month: "Nov", revenue: 7600, orders: 330 },
  { month: "Dec", revenue: 9100, orders: 400 },
];

export function RevenueChart() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-soft border border-border/50 animate-slide-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-sm text-muted-foreground">Monthly revenue for 2024</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-2" />
            <span className="text-sm text-muted-foreground">Orders</span>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(172 66% 40%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(172 66% 40%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(220 70% 50%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(220 70% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(220 10% 50%)', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(220 10% 50%)', fontSize: 12 }}
              tickFormatter={(value) => `$${value / 1000}k`}
              dx={-10}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          {entry.name}: <span className="font-medium text-foreground">
                            {entry.name === 'revenue' ? `$${entry.value?.toLocaleString()}` : entry.value}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(172 66% 40%)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="hsl(220 70% 50%)"
              strokeWidth={2}
              fill="url(#ordersGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
