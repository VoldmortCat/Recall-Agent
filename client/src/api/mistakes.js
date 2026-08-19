import request from './request'

export function createMistake(data) {
  return request.post('/mistakes', data)
}

export function getMistakeList(params) {
  return request.get('/mistakes', { params })
}

export function getMistakeDetail(id) {
  return request.get(`/mistakes/${id}`)
}

export function updateMistake(id, data) {
  return request.put(`/mistakes/${id}`, data)
}

export function deleteMistake(id) {
  return request.delete(`/mistakes/${id}`)
}

export function uploadImage(formData) {
  return request.post('/mistakes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}