import client from './client'

export const getProducts = (params) =>
  client.get('/api/products', { params }).then(r => r.data)

export const createProduct = (data) =>
  client.post('/api/products', data).then(r => r.data)

export const updateProduct = (id, data) =>
  client.put(`/api/products/${id}`, data).then(r => r.data)

export const deleteProduct = (id) =>
  client.delete(`/api/products/${id}`).then(r => r.data)

export const getInventorySummary = () =>
  client.get('/api/products/summary').then(r => r.data)

export const recordStockMovement = (data) =>
  client.post('/api/products/stock/movement', data).then(r => r.data)
