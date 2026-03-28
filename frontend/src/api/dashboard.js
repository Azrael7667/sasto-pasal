import client from './client'

export const getDashboardSummary = () =>
  client.get('/api/dashboard/summary').then(r => r.data)

export const getHealthScore = () =>
  client.get('/api/dashboard/health-score').then(r => r.data)

export const getProfitLoss = (period = 'monthly') =>
  client.get(`/api/dashboard/profit-loss?period=${period}`).then(r => r.data)
