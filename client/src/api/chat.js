import request from './request'

// AI 答疑对话：history = [{ role: 'user'|'assistant', content }]
export function chat(history) {
  return request.post('/chat', { messages: history })
}
