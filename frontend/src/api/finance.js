import client from './client'

export const getInvoices = (params) =>
  client.get('/api/invoices', { params }).then(r => r.data)

export const createInvoice = (data) =>
  client.post('/api/invoices', data).then(r => r.data)

export const getInvoiceSummary = () =>
  client.get('/api/invoices/summary').then(r => r.data)

export const getPurchases = (params) =>
  client.get('/api/purchases', { params }).then(r => r.data)

export const createPurchase = (data) =>
  client.post('/api/purchases', data).then(r => r.data)

export const getPurchaseSummary = () =>
  client.get('/api/purchases/summary').then(r => r.data)
