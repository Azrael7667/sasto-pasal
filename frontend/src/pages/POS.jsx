import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getProducts } from '../api/products'
import { getTransactions, createTransaction, getDailySummary } from '../api/transactions'
import { ShoppingCart, Plus, Minus, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const PAYMENT_MODES = ['Cash', 'Esewa', 'Khalti', 'Credit', 'Bank Transfer']

export default function POS() {
  const [cart,      setCart]      = useState([])
  const [search,    setSearch]    = useState('')
  const [discount,  setDiscount]  = useState(0)
  const [payMode,   setPayMode]   = useState('Cash')
  const [activeTab, setActiveTab] = useState('pos')

  const { data: products = [] } = useQuery({
    queryKey: ['products', search],
    queryFn: () => getProducts({ search: search || undefined }),
  })

  const { data: daily } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => getDailySummary(),
    enabled: activeTab === 'register',
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions({ limit: 20 }),
    enabled: activeTab === 'register',
  })

  const saleMut = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      toast.success('Sale completed successfully!')
      setCart([])
      setDiscount(0)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Sale failed'),
  })

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id
          ? { ...i, qty: i.qty + 1 }
          : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id, delta) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0))
  }

  const subtotal = cart.reduce((s, i) => s + i.sell_price * i.qty, 0)
  const total    = Math.max(0, subtotal - discount)

  const handleSale = () => {
    if (cart.length === 0) return toast.error('Add items to cart first')
    saleMut.mutate({
      items: cart.map(i => ({
        product_id: i.id,
        quantity: i.qty,
        unit_price: i.sell_price,
      })),
      discount,
      payment_mode: payMode,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POS & Daily Register</h1>
          <p className="text-gray-500 text-sm">Create sales and view daily transactions</p>
        </div>
        <div className="flex gap-2">
          {['pos','register'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={activeTab === t ? 'btn-primary' : 'btn-secondary'}>
              {t === 'pos' ? 'New Sale' : 'Daily Register'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input className="input pl-9" placeholder="Search products to add..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="card p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all">
                  <div className="font-medium text-gray-900 text-sm leading-tight">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{p.category}</div>
                  <div className="text-indigo-600 font-bold mt-2">Rs {p.sell_price.toLocaleString()}</div>
                  <div className={`text-xs mt-1 ${p.current_stock < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                    Stock: {p.current_stock} {p.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="card p-4 h-fit sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShoppingCart size={18} /> Cart ({cart.length} items)
            </h3>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click products to add</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                      <div className="text-xs text-indigo-600">Rs {item.sell_price.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-sm font-bold w-16 text-right">
                      Rs {(item.sell_price * item.qty).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">Rs {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Discount (Rs)</span>
                  <input type="number" className="input text-sm py-1 flex-1"
                    value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-indigo-600">Rs {total.toLocaleString()}</span>
                </div>
                <select className="input text-sm" value={payMode} onChange={e => setPayMode(e.target.value)}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
                <button onClick={handleSale} disabled={saleMut.isPending}
                  className="btn-primary w-full py-3 text-base disabled:opacity-60">
                  {saleMut.isPending ? 'Processing...' : `Complete Sale · Rs ${total.toLocaleString()}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <div className="space-y-4">
          {daily && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:"Today's Revenue",      value:`Rs ${daily.total_revenue.toLocaleString()}` },
                { label:"Today's Profit",        value:`Rs ${daily.total_profit.toLocaleString()}` },
                { label:'Transactions',          value: daily.total_transactions },
                { label:'Avg Transaction',       value:`Rs ${daily.total_transactions ? Math.round(daily.total_revenue/daily.total_transactions).toLocaleString() : 0}` },
              ].map(s => (
                <div key={s.label} className="card p-4">
                  <p className="text-xs text-gray-500 uppercase">{s.label}</p>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['ID','Customer','Items','Total','Payment','Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-indigo-600 font-medium">#{t.id}</td>
                    <td className="px-4 py-3">{t.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-3">{t.items.length} items</td>
                    <td className="px-4 py-3 font-bold">Rs {t.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-${t.payment_mode === 'Cash' ? 'ok' : t.payment_mode === 'Credit' ? 'warning' : 'blue'}`}>
                        {t.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(t.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions today</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
