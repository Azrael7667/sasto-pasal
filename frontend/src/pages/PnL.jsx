import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProfitLoss } from '../api/dashboard'
import { TrendingUp, TrendingDown } from 'lucide-react'

const PERIODS = [
  { value:'weekly',  label:'This Week'  },
  { value:'monthly', label:'This Month' },
  { value:'yearly',  label:'This Year'  },
]

export default function PnL() {
  const [period, setPeriod] = useState('monthly')
  const { data: pnl, isLoading } = useQuery({
    queryKey: ['pnl', period],
    queryFn: () => getProfitLoss(period),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-500 text-sm">Full financial breakdown for your store</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={period === p.value ? 'btn-primary' : 'btn-secondary'}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : pnl ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Total Revenue',   value:`Rs ${pnl.revenue.toLocaleString()}`,       color:'indigo', up:true  },
              { label:'Gross Profit',    value:`Rs ${pnl.gross_profit.toLocaleString()}`,   color:'green',  up:true  },
              { label:'Total Expenses',  value:`Rs ${pnl.total_expenses.toLocaleString()}`, color:'red',    up:false },
              { label:'Net Profit',      value:`Rs ${pnl.net_profit.toLocaleString()}`,     color: pnl.net_profit >= 0 ? 'green' : 'red', up: pnl.net_profit >= 0 },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase">{s.label}</p>
                  {s.up ? <TrendingUp size={16} className="text-green-500" /> : <TrendingDown size={16} className="text-red-500" />}
                </div>
                <p className={`text-2xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* P&L Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
              <div className="space-y-1">
                {[
                  { label:'Total Revenue',      value: pnl.revenue,         type:'income'  },
                  { label:'Cost of Goods Sold', value: pnl.cogs,            type:'expense' },
                  { label:'Gross Profit',       value: pnl.gross_profit,    type:'subtotal'},
                  { label:`Gross Margin`,       value:`${pnl.gross_margin}%`,type:'percent' },
                  { label:'Operating Expenses', value: pnl.total_expenses,  type:'expense' },
                  { label:'Net Profit',         value: pnl.net_profit,      type:'total'   },
                  { label:'Net Margin',         value:`${pnl.net_margin}%`, type:'percent' },
                ].map(row => (
                  <div key={row.label} className={`flex justify-between py-2.5 px-3 rounded-lg ${
                    row.type === 'total'   ? 'bg-indigo-50 font-bold' :
                    row.type === 'subtotal'? 'bg-gray-50 font-semibold' :
                    row.type === 'percent' ? 'bg-green-50' : ''
                  }`}>
                    <span className={`text-sm ${row.type === 'total' ? 'text-indigo-800' : 'text-gray-600'}`}>
                      {row.label}
                    </span>
                    <span className={`text-sm font-medium ${
                      row.type === 'expense' ? 'text-red-600' :
                      row.type === 'income'  ? 'text-green-600' :
                      row.type === 'total'   ? (pnl.net_profit >= 0 ? 'text-green-700' : 'text-red-700') :
                      'text-gray-900'
                    }`}>
                      {typeof row.value === 'number' ? `Rs ${row.value.toLocaleString()}` : row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              {Object.entries(pnl.expense_breakdown || {}).length === 0 ? (
                <div className="text-center py-8 text-gray-400">No expenses recorded for this period</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(pnl.expense_breakdown || {}).map(([cat, amount]) => {
                    const pct = pnl.total_expenses > 0 ? (amount / pnl.total_expenses * 100) : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{cat}</span>
                          <span className="font-medium">Rs {amount.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
