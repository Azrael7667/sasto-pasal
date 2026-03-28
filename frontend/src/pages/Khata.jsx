import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomers, getCustomersSummary, addKhataEntry, getAllKhata } from '../api/customers'
import { BookOpen, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Khata() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    customer_id: '', type: 'Credit Given', amount: '', description: '', status: 'Pending'
  })

  const { data: summary } = useQuery({ queryKey: ['customers-summary'], queryFn: getCustomersSummary })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => getCustomers() })
  const { data: entries = [] } = useQuery({ queryKey: ['khata'], queryFn: () => getAllKhata() })

  const addMut = useMutation({
    mutationFn: addKhataEntry,
    onSuccess: () => {
      qc.invalidateQueries(['khata'])
      qc.invalidateQueries(['customers-summary'])
      toast.success('Khata entry added!')
      setShowAdd(false)
      setForm({ customer_id:'', type:'Credit Given', amount:'', description:'', status:'Pending' })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khata / Udharo Ledger</h1>
          <p className="text-gray-500 text-sm">Track all credit given and payments received</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Udharo',       value:`Rs ${summary.total_outstanding.toLocaleString()}`, color:'red'    },
            { label:'Customers on Credit',value: summary.customers_with_credit,                     color:'yellow' },
            { label:'Overdue Accounts',   value: summary.overdue_customers,                         color:'red'    },
            { label:'Overdue Amount',     value:`Rs ${summary.overdue_amount.toLocaleString()}`,    color:'orange' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase">{s.label}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Entries */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">All Khata Entries</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p>No khata entries yet</p>
            </div>
          ) : entries.map(e => (
            <div key={e.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${e.type === 'Credit Given' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {e.type === 'Credit Given' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{e.customer_name}</div>
                  <div className="text-xs text-gray-500">{e.description} · {new Date(e.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${e.type === 'Credit Given' ? 'text-red-600' : 'text-green-600'}`}>
                  {e.type === 'Credit Given' ? '+' : '-'} Rs {e.amount.toLocaleString()}
                </div>
                <span className={`text-xs badge-${e.status === 'Paid' ? 'ok' : e.status === 'Overdue' ? 'critical' : 'warning'}`}>
                  {e.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customers with credit */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Customers with Outstanding Udharo</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Customer','City','Segment','Outstanding','Credit Days','Limit'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.filter(c => c.outstanding_credit > 0).map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.city}</td>
                <td className="px-4 py-3">{c.segment}</td>
                <td className="px-4 py-3 font-bold text-red-600">Rs {c.outstanding_credit.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={c.credit_days > 30 ? 'badge-critical' : 'badge-warning'}>
                    {c.credit_days} days
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">Rs {c.credit_limit.toLocaleString()}</td>
              </tr>
            ))}
            {customers.filter(c => c.outstanding_credit > 0).length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No outstanding credits</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Entry Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Add Khata Entry</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                <select className="input" value={form.customer_id}
                  onChange={e => setForm({...form, customer_id: e.target.value})}>
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select className="input" value={form.type}
                  onChange={e => setForm({...form, type: e.target.value})}>
                  <option>Credit Given</option>
                  <option>Payment Received</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs)</label>
                <input className="input" type="number" placeholder="5000"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input className="input" placeholder="e.g. Monthly grocery purchase"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}>
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Overdue</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => addMut.mutate({
                customer_id: parseInt(form.customer_id),
                type: form.type,
                amount: parseFloat(form.amount),
                description: form.description,
                status: form.status,
              })} className="btn-primary flex-1" disabled={addMut.isPending}>
                {addMut.isPending ? 'Saving...' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
