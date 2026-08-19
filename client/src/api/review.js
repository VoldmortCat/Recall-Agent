import request from './request'

export function getTodayReview() {
  return request.get('/review/today')
}

export function submitReview(mistakeId, data) {
  return request.post(`/review/${mistakeId}`, data)
}

export function getReviewProgress() {
  return request.get('/review/progress')
}