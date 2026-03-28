import client from './client'

export const getCustomers = (params) =>
  client.get('/api/customers', { params }).then(r => r.data)

export const createCustomer = (data) =>
  client.post('/api/customers', data).then(r => r.data)

export const updateCustomer = (id, data) =>
  client.put(`/api/customers/${id}`, data).then(r => r.data)

export const getCustomersSummary = () =>
  client.get('/api/customers/summary').then(r => r.data)

export const addKhataEntry = (data) =>
  client.post('/api/customers/khata/entry', data).then(r => r.data)

export const getAllKhata = (params) =>
  client.get('/api/customers/khata/all', { params }).then(r => r.data)

export const getCustomerKhata = (customerId) =>
  client.get(`/api/customers/${customerId}/khata`).then(r => r.data)
