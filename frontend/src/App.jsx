import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 }
  }
})

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/"             element={<Dashboard />} />
              <Route path="/pos"          element={<Placeholder title="POS & Daily Register" />} />
              <Route path="/inventory"    element={<Placeholder title="Inventory & Stock" />} />
              <Route path="/khata"        element={<Placeholder title="Khata / Udharo Ledger" />} />
              <Route path="/invoices"     element={<Placeholder title="Invoices & Billing" />} />
              <Route path="/pnl"          element={<Placeholder title="Profit & Loss" />} />
              <Route path="/purchases"    element={<Placeholder title="Purchases & Expenses" />} />
              <Route path="/ai/forecast"  element={<Placeholder title="AI Cash Flow Forecast" />} />
              <Route path="/ai/customers" element={<Placeholder title="Customer Churn AI" />} />
              <Route path="/ai/hr"        element={<Placeholder title="HR Attrition AI" />} />
              <Route path="/ai/anomalies" element={<Placeholder title="Anomaly Detection AI" />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { borderRadius: '10px', fontSize: '14px' }
          }} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
