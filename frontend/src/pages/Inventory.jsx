import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, createProduct, recordStockMovement } from '../api/products'
import { Package, Plus, AlertTriangle, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Grocery', 'Household', 'Auto Parts']

function StatusBadge({ status }) {
  if (status === 'Critical') return <span className="badge-critical">Critical</span>
  if (status === 'Warning')  return <span className="badge-warning">Warning</span>
  return <span className="badge-ok">OK</span>
}

export default function Inventory() {
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [search,   setSearch]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [showMove, setShowMove] = useState(null)
  const [form, setForm] = useState({
    name:'', category:'Grocery', sell_price:'', cost_price:'',
    current_stock:'', reorder_point:'20', daily_demand:'1',
    unit:'pcs', supplier:''
  })
  const [moveForm, setMoveForm] = useState({ type:'in', quantity:'', reason:'' })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category, search],
    queryFn: () => getProducts({ category: category||undefined, search: search||undefined }),
  })

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      qc.invalidateQueries(['products'])
      toast.success('Product added!')
      setShowAdd(false)
      setForm({ name:'', category:'Grocery', sell_price:'', cost_price:'',
        current_stock:'', reorder_point:'20', daily_demand:'1', unit:'pcs', supplier:'' })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to add product'),
  })

  const moveMut = useMutation({
    mutationFn: recordStockMovement,
    onSuccess: () => {
      qc.invalidateQueries(['products'])
      toast.success('Stock movement recorded!')
      setShowMove(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const critical = products.filter(p => p.status === 'Critical').length
  const warning  = products.filter(p => p.status === 'Warning').length
  const ok       = products.filter(p => p.status === 'OK').length
  const totalVal = products.reduce((s, p) => s + p.stock_value, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & Stock</h1>
          <p className="text-gray-500 text-sm">Manage all products across Grocery, Household & Auto Parts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Products', value: products.length, color:'indigo' },
          { label:'Critical',       value: critical,        color:'red'    },
          { label:'Warning',        value: warning,         color:'yellow' },
          { label:'Stock Value',    value:`Rs ${totalVal.toLocaleString()}`, color:'green' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input w-48" placeholder="Search products..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-40" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Product','Category','Stock','Days Left','Status','Sell Price','Cost','Stock Value','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No products found. Add your first product!</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.category}</td>
                <td className="px-4 py-3 font-medium">{p.current_stock} {p.unit}</td>
                <td className="px-4 py-3">{p.days_of_stock} days</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">Rs {p.sell_price.toLocaleString()}</td>
                <td className="px-4 py-3">Rs {p.cost_price.toLocaleString()}</td>
                <td className="px-4 py-3">Rs {p.stock_value.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setShowMove(p)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                    Stock Move
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Product</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
                <input className="input" placeholder="e.g. Basmati Rice 5kg"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                <input className="input" placeholder="pcs / kg / L"
                  value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sell Price (Rs)</label>
                <input className="input" type="number" placeholder="850"
                  value={form.sell_price} onChange={e => setForm({...form, sell_price: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost Price (Rs)</label>
                <input className="input" type="number" placeholder="620"
                  value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Stock</label>
                <input className="input" type="number" placeholder="100"
                  value={form.current_stock} onChange={e => setForm({...form, current_stock: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Daily Demand</label>
                <input className="input" type="number" placeholder="5"
                  value={form.daily_demand} onChange={e => setForm({...form, daily_demand: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reorder Point</label>
                <input className="input" type="number" placeholder="20"
                  value={form.reorder_point} onChange={e => setForm({...form, reorder_point: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
                <input className="input" placeholder="Supplier name"
                  value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => createMut.mutate({
                name: form.name, category: form.category,
                sell_price: parseFloat(form.sell_price),
                cost_price: parseFloat(form.cost_price),
                current_stock: parseFloat(form.current_stock),
                reorder_point: parseFloat(form.reorder_point),
                daily_demand: parseFloat(form.daily_demand),
                unit: form.unit, supplier: form.supplier,
              })} className="btn-primary flex-1" disabled={createMut.isPending}>
                {createMut.isPending ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Modal */}
      {showMove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Stock Movement</h2>
            <p className="text-sm text-gray-500 mb-4">{showMove.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Movement Type</label>
                <select className="input" value={moveForm.type}
                  onChange={e => setMoveForm({...moveForm, type: e.target.value})}>
                  <option value="in">Stock In (Purchase/Delivery)</option>
                  <option value="out">Stock Out (Damage/Return)</option>
                  <option value="adjustment">Adjustment (Set exact amount)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <input className="input" type="number" placeholder="Enter quantity"
                  value={moveForm.quantity} onChange={e => setMoveForm({...moveForm, quantity: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <input className="input" placeholder="e.g. Monthly restock"
                  value={moveForm.reason} onChange={e => setMoveForm({...moveForm, reason: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowMove(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => moveMut.mutate({
                product_id: showMove.id,
                type: moveForm.type,
                quantity: parseFloat(moveForm.quantity),
                reason: moveForm.reason,
              })} className="btn-primary flex-1" disabled={moveMut.isPending}>
                {moveMut.isPending ? 'Saving...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
