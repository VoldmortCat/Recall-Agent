import request from './request'

export function getHeatmap(params) {
  return request.get('/analysis/heatmap', { params })
}

export function getKnowledgeGraph(params) {
  return request.get('/analysis/knowledge-graph', { params })
}

export function getReport() {
  return request.get('/analysis/report')
}