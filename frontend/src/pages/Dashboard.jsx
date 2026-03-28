import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary, getHealthScore } from '../api/dashboard'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, Users, AlertTriangle } from 'lucide-react'
import RsIcon from '../components/RsIcon'

function StatCard({ title, value, sub, icon: Icon, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    green:  "bg-green-50 text-green-600",
    red:    "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function HealthGauge({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Warning' : 'Critical'
  return (
    <div className="card p-6 flex flex-col items-center">
      <h3 className="font-semibold text-gray-900 mb-4">Business Health Score</h3>
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="90%"
            data={[{ value: score, fill: color }]} startAngle={180} endAngle={0}>
            <RadialBar dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{score}</span>
          <span className="text-sm font-medium" style={{ color }}>{label}</span>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 30000,
  })

  const { data: health } = useQuery({
    queryKey: ['health-score'],
    queryFn: getHealthScore,
    refetchInterval: 60000,
  })

  if (sumLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  )

  const s      = summary || {}
  const today  = s.today     || {}
  const inv    = s.inventory || {}
  const cust   = s.customers || {}
  const alerts = s.alerts    || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Sasto Pasal · Real-time business overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={`Rs ${(today.revenue||0).toLocaleString()}`}
          sub={`${today.transactions||0} transactions`}
          icon={RsIcon}
          color="indigo"
        />
        <StatCard
          title="Today's Profit"
          value={`Rs ${(today.profit||0).toLocaleString()}`}
          sub="After cost of goods"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Critical Stock"
          value={inv.critical_count||0}
          sub={`${inv.warning_count||0} items on warning`}
          icon={Package}
          color="red"
        />
        <StatCard
          title="Total Udharo"
          value={`Rs ${(cust.total_udharo||0).toLocaleString()}`}
          sub={`${cust.overdue_count||0} overdue accounts`}
          icon={RsIcon}
          color="yellow"
        />
      </div>

      {/* Health + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {health && <HealthGauge score={health.health_score || 0} />}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Active Alerts
          </h3>
          <div className="space-y-2">
            {(alerts.critical_stock||[]).map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <span className="text-red-800 text-sm font-medium">{item.name}</span>
                  <span className="text-red-600 text-xs ml-2">Critical stock</span>
                </div>
                <span className="badge-critical">{item.days_left} days left</span>
              </div>
            ))}
            {(alerts.low_stock||[]).map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div>
                  <span className="text-yellow-800 text-sm font-medium">{item.name}</span>
                  <span className="text-yellow-600 text-xs ml-2">Low stock</span>
                </div>
                <span className="badge-warning">{item.days_left} days left</span>
              </div>
            ))}
            {(alerts.overdue_udharo||[]).map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                <span className="text-orange-800 text-sm font-medium">{c.name}</span>
                <span className="badge-warning">Rs {c.amount.toLocaleString()} overdue</span>
              </div>
            ))}
            {!alerts.critical_stock?.length && !alerts.low_stock?.length && !alerts.overdue_udharo?.length && (
              <div className="p-4 bg-green-50 rounded-lg text-green-700 text-sm text-center">
                ✅ No active alerts — all systems healthy
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health score breakdown */}
      {health && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Health Score Breakdown</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(health.breakdown || {}).map(([key, val]) => (
              <div key={key} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-indigo-600">{val.score}/100</div>
                <div className="text-sm font-medium text-gray-700 capitalize mt-1">{key}</div>
                <div className="text-xs text-gray-500 mt-1">{val.weight}</div>
                <div className="text-xs text-gray-400 mt-1">{val.metric}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today payment breakdown */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Today's Payment Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-indigo-50 rounded-xl">
            <div className="text-xs font-semibold text-indigo-400 mb-1">नगद / Cash</div>
            <div className="text-xl font-bold text-indigo-700">
              रू {(today.cash_sales||0).toLocaleString()}
            </div>
            <div className="text-sm text-indigo-600 mt-1">Cash Sales</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl">
            <div className="text-xs font-semibold text-orange-400 mb-1">उधारो / Credit</div>
            <div className="text-xl font-bold text-orange-700">
              रू {(today.credit_sales||0).toLocaleString()}
            </div>
            <div className="text-sm text-orange-600 mt-1">Credit Sales</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-xs font-semibold text-green-400 mb-1">डिजिटल / Digital</div>
            <div className="text-xl font-bold text-green-700">
              रू {(today.digital_sales||0).toLocaleString()}
            </div>
            <div className="text-sm text-green-600 mt-1">Esewa / Khalti</div>
          </div>
        </div>
      </div>
    </div>
  )
}
