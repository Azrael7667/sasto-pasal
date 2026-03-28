import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoices, createInvoice, getInvoiceSummary } from '../api/finance'
import { getProducts } from '../api/products'
import { getCustomers } from '../api/customers'
import { FileText, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Invoices() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [cart, setCart] = useState([])
  const [form, setForm] = useState({
    customer_id:'', customer_name:'', discount:0, payment_mode:'Cash', status:'Paid', notes:''
  })
  const [selectedProduct, setSelectedProduct] = useState('')
  const [qty, setQty] = useState(1)

  const { data: summary }      = useQuery({ queryKey:['invoice-summary'], queryFn: getInvoiceSummary })
  const { data: invoices = [] } = useQuery({ queryKey:['invoices', statusFilter], queryFn: () => getInvoices({ status: statusFilter||undefined }) })
  const { data: products = [] } = useQuery({ queryKey:['products'], queryFn: () => getProducts() })
  const { data: customers = [] }= useQuery({ queryKey:['customers'], queryFn: () => getCustomers() })

  const createMut = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      qc.invalidateQueries(['invoices'])
      qc.invalidateQueries(['invoice-summary'])
      toast.success('Invoice created!')
      setShowCreate(false)
      setCart([])
      setForm({ customer_id:'', customer_name:'', discount:0, payment_mode:'Cash', status:'Paid', notes:'' })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const addItem = () => {
    if (!selectedProduct) return
    const p = products.find(x => x.id === parseInt(selectedProduct))
    if (!p) return
    setCart(prev => {
      const ex = prev.find(i => i.product_id === p.id)
      if (ex) return prev.map(i => i.product_id === p.id ? {...i, quantity: i.quantity + qty} : i)
      return [...prev, { product_id: p.id, name: p.name, unit_price: p.sell_price, quantity: qty }]
    })
  }

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const total    = Math.max(0, subtotal - (form.discount || 0))

  const handleCreate = () => {
    if (cart.length === 0) return toast.error('Add at least one item')
    createMut.mutate({
      customer_id: form.customer_id ? parseInt(form.customer_id) : undefined,
      customer_name: form.customer_name || undefined,
      items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
      discount: parseFloat(form.discount)||0,
      payment_mode: form.payment_mode,
      status: form.status,
      notes: form.notes,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Billing</h1>
          <p className="text-gray-500 text-sm">Create and manage all invoices</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Billed',    value:`Rs ${summary.total_billed.toLocaleString()}` },
            { label:'Paid',            value: summary.paid },
            { label:'Pending',         value: summary.pending },
            { label:'Pending Amount',  value:`Rs ${summary.pending_amount.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase">{s.label}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 flex gap-3">
        {['','Paid','Pending','Overdue'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? 'btn-primary text-sm py-1.5' : 'btn-secondary text-sm py-1.5'}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Invoice #','Customer','Total','Payment','Status','Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No invoices yet</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-indigo-600">{inv.invoice_number}</td>
                <td className="px-4 py-3">{inv.customer_name || 'Walk-in'}</td>
                <td className="px-4 py-3 font-bold">Rs {inv.total.toLocaleString()}</td>
                <td className="px-4 py-3">{inv.payment_mode}</td>
                <td className="px-4 py-3">
                  <span className={`badge-${inv.status==='Paid'?'ok':inv.status==='Overdue'?'critical':'warning'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Create New Invoice</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                <select className="input" value={form.customer_id}
                  onChange={e => setForm({...form, customer_id: e.target.value})}>
                  <option value="">Walk-in / Manual</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name (if manual)</label>
                <input className="input" placeholder="Customer name"
                  value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
                <select className="input" value={form.payment_mode}
                  onChange={e => setForm({...form, payment_mode: e.target.value})}>
                  {['Cash','Esewa','Khalti','Credit','Bank Transfer'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select className="input" value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}>
                  {['Paid','Pending','Overdue'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="border rounded-xl p-4 mb-4">
              <h4 className="font-medium text-sm mb-3">Add Items</h4>
              <div className="flex gap-2 mb-3">
                <select className="input flex-1" value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} — Rs {p.sell_price}</option>)}
                </select>
                <input type="number" className="input w-20" value={qty} min={1}
                  onChange={e => setQty(parseInt(e.target.value)||1)} />
                <button onClick={addItem} className="btn-primary px-4">Add</button>
              </div>
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">{item.name} × {item.quantity}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Rs {(item.unit_price * item.quantity).toLocaleString()}</span>
                    <button onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}>
                      <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Discount</span>
                    <input type="number" className="input py-1 w-28 text-sm"
                      value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} />
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>Total</span><span className="text-indigo-600">Rs {total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreate} className="btn-primary flex-1" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
