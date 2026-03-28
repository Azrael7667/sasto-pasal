import client from './client'

export const loginApi = (data) =>
  client.post('/api/auth/login', data).then(r => r.data)

export const registerApi = (data) =>
  client.post('/api/auth/register', data).then(r => r.data)

export const getMeApi = () =>
  client.get('/api/auth/me').then(r => r.data)
