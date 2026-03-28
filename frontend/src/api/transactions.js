import client from './client'

export const createTransaction = (data) =>
  client.post('/api/transactions', data).then(r => r.data)

export const getTransactions = (params) =>
  client.get('/api/transactions', { params }).then(r => r.data)

export const getDailySummary = (date) =>
  client.get('/api/transactions/daily-summary', { params: { target_date: date } }).then(r => r.data)

export const getRangeSummary = (days) =>
  client.get('/api/transactions/range-summary', { params: { days } }).then(r => r.data)
