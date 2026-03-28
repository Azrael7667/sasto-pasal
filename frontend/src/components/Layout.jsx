import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ShoppingCart, Package, BookOpen,
  FileText, TrendingUp, ShoppingBag, Brain, Users,
  UserCheck, AlertTriangle, LogOut, Menu, X, Store
} from 'lucide-react'

const navItems = [
  { section: "Operations" },
  { path: "/",           label: "Dashboard",      icon: LayoutDashboard },
  { path: "/pos",        label: "POS & Register",  icon: ShoppingCart },
  { path: "/inventory",  label: "Inventory",       icon: Package },
  { path: "/khata",      label: "Khata / Udharo",  icon: BookOpen },
  { path: "/invoices",   label: "Invoices",        icon: FileText },
  { path: "/pnl",        label: "Profit & Loss",   icon: TrendingUp },
  { path: "/purchases",  label: "Purchases",       icon: ShoppingBag },
  { section: "AI Intelligence" },
  { path: "/ai/forecast",   label: "Cash Forecast", icon: Brain },
  { path: "/ai/customers",  label: "Churn AI",      icon: Users },
  { path: "/ai/hr",         label: "HR Attrition",  icon: UserCheck },
  { path: "/ai/anomalies",  label: "Anomaly AI",    icon: AlertTriangle },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate  = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-[#1e2139] flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Store className="text-indigo-400 flex-shrink-0" size={22} />
          {sidebarOpen && (
            <div>
              <div className="text-white font-semibold text-sm">Sasto Pasal</div>
              <div className="text-indigo-300 text-xs">{user?.store_name}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item, i) => {
            if (item.section) {
              return sidebarOpen ? (
                <div key={i} className="text-xs text-white/40 uppercase tracking-wider px-3 pt-4 pb-1 font-medium">
                  {item.section}
                </div>
              ) : <div key={i} className="my-2 border-t border-white/10" />
            }
            const Icon    = item.icon
            const active  = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-colors ${
                  active ? 'bg-indigo-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}>
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-3">
          {sidebarOpen && (
            <div className="text-white/60 text-xs mb-2 px-1">
              {user?.user_name} · {user?.user_role}
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 w-full transition-colors">
            <LogOut size={16} />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-NP', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
