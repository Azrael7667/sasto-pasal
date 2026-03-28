import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPurchases, createPurchase, getPurchaseSummary } from '../api/finance'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES    = ['Grocery','Household','Auto Parts','Operational','Utilities','Other']
const PAYMENT_MODES = ['Cash','Bank Transfer','Credit','Cheque']

export default function Purchases() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [catFilter, setCatFilter] = useState('')
  const [form, setForm] = useState({
    supplier:'', category:'Grocery', description:'',
    amount:'', payment_mode:'Cash', status:'Paid', date:''
  })

  const { data: summary }       = useQuery({ queryKey:['purchase-summary'], queryFn: getPurchaseSummary })
  const { data: purchases = [] } = useQuery({ queryKey:['purchases', catFilter], queryFn: () => getPurchases({ category: catFilter||undefined }) })

  const addMut = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      qc.invalidateQueries(['purchases'])
      qc.invalidateQueries(['purchase-summary'])
      toast.success('Purchase recorded!')
      setShowAdd(false)
      setForm({ supplier:'', category:'Grocery', description:'', amount:'', payment_mode:'Cash', status:'Paid', date:'' })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases & Expenses</h1>
          <p className="text-gray-500 text-sm">Record all stock purchases and operational expenses</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Purchase
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Purchases',  value: summary.total_purchases },
            { label:'Total Spent',      value:`Rs ${summary.total_spent.toLocaleString()}` },
            { label:'Paid',             value: summary.paid },
            { label:'Pending Payment',  value:`Rs ${summary.pending_amount.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase">{s.label}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category spend */}
      {summary && Object.keys(summary.by_category||{}).length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Spend by Category</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(summary.by_category).map(([cat, amt]) => (
              <div key={cat} className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500">{cat}</div>
                <div className="text-lg font-bold text-indigo-600 mt-1">Rs {amt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card p-4 flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter('')}
          className={!catFilter ? 'btn-primary text-sm py-1.5' : 'btn-secondary text-sm py-1.5'}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={catFilter===c ? 'btn-primary text-sm py-1.5' : 'btn-secondary text-sm py-1.5'}>{c}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date','Supplier','Category','Description','Amount','Payment','Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchases.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No purchases yet</td></tr>
            ) : purchases.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">{p.supplier || '—'}</td>
                <td className="px-4 py-3"><span className="badge-blue">{p.category}</span></td>
                <td className="px-4 py-3 text-gray-600">{p.description}</td>
                <td className="px-4 py-3 font-bold text-red-600">Rs {p.amount.toLocaleString()}</td>
                <td className="px-4 py-3">{p.payment_mode}</td>
                <td className="px-4 py-3">
                  <span className={`badge-${p.status==='Paid'?'ok':'warning'}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Record Purchase / Expense</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier / Payee</label>
                <input className="input" placeholder="e.g. Ram Suppliers Ktm"
                  value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select className="input" value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input className="input" placeholder="e.g. Monthly stock replenishment"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (Rs)</label>
                <input className="input" type="number" placeholder="45000"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
                  <select className="input" value={form.payment_mode}
                    onChange={e => setForm({...form, payment_mode: e.target.value})}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className="input" value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}>
                    <option>Paid</option>
                    <option>Pending</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => addMut.mutate({
                supplier: form.supplier,
                category: form.category,
                description: form.description,
                amount: parseFloat(form.amount),
                payment_mode: form.payment_mode,
                status: form.status,
              })} className="btn-primary flex-1" disabled={addMut.isPending}>
                {addMut.isPending ? 'Saving...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
