import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Project APIs
export const projectApi = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`)
}

// Chapter APIs
export const chapterApi = {
  getByProject: (projectId) => api.get(`/chapters/project/${projectId}`),
  getById: (id) => api.get(`/chapters/${id}`),
  create: (data) => api.post('/chapters', data),
  update: (id, data) => api.put(`/chapters/${id}`, data),
  delete: (id) => api.delete(`/chapters/${id}`)
}

// Manuscript Upload APIs
export const uploadApi = {
  uploadManuscript: (file, projectId, chapterTitle = null) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', projectId)
    if (chapterTitle) {
      formData.append('chapter_title', chapterTitle)
    }
    return api.post('/manuscripts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  previewManuscript: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/manuscripts/upload-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// Style Preset APIs
export const stylePresetApi = {
  getAll: () => api.get('/style-presets'),
  getById: (id) => api.get(`/style-presets/${id}`),
  create: (data) => api.post('/style-presets', data),
  update: (id, data) => api.put(`/style-presets/${id}`, data),
  delete: (id) => api.delete(`/style-presets/${id}`)
}

// Art Asset APIs
export const artAssetApi = {
  getByProject: (projectId) => api.get(`/art-assets/project/${projectId}`),
  create: (data) => api.post('/art-assets', data),
  delete: (id) => api.delete(`/art-assets/${id}`)
}

// Tone Profile APIs
export const toneProfileApi = {
  getByProject: (projectId) => api.get(`/tone-profiles/project/${projectId}`),
  getByChapter: (chapterId) => api.get(`/tone-profiles/chapter/${chapterId}`)
}

// AI APIs
export const aiApi = {
  rewrite: (content, tone) => api.post('/ai/rewrite', { content, tone }),
  summarize: (content) => api.post('/ai/summarize', { content }),
  generateOutline: (projectSummary, targetChapterCount) => 
    api.post('/ai/outline', { project_summary: projectSummary, target_chapter_count: targetChapterCount }),
  analyzeWorkflow: (statusDescription) => 
    api.post('/ai/workflow-analysis', { status_description: statusDescription }),
  analyzeTone: (content, projectId, chapterId) => 
    api.post('/ai/analyze-tone', { content, project_id: projectId, chapter_id: chapterId }),
  generateArtPrompts: (projectId, chapterId, stylePreset, promptType, context) =>
    api.post('/ai/art-prompts', { 
      project_id: projectId, 
      chapter_id: chapterId, 
      style_preset: stylePreset, 
      prompt_type: promptType,
      context 
    }),
  askThad: (query, context) => api.post('/ai/ask-thad', { query, context })
}

// Market Intelligence APIs
export const marketApi = {
  generateBookIdeas: (universe, count = 10) => 
    api.post('/ai/market/book-ideas', { universe, count }),
  analyzeMarket: (genre, ageGroup) => 
    api.post('/ai/market/analysis', { genre, age_group: ageGroup }),
  customerResearch: (bookIdea) => 
    api.post('/ai/market/customer-research', { book_idea: bookIdea }),
  generateMarketOutline: (bookIdea, chapterCount = 12) => 
    api.post('/ai/market/outline', { book_idea: bookIdea, chapter_count: chapterCount }),
  generateManuscriptDraft: (bookIdea, wordCount = 30000) => 
    api.post('/ai/market/manuscript-draft', { book_idea: bookIdea, word_count: wordCount }),
  generateBookDescription: (bookTitle, bookSummary) => 
    api.post('/ai/market/book-description', { book_title: bookTitle, book_summary: bookSummary }),
  analyzeSales: (salesData) => 
    api.post('/ai/market/sales-analysis', { sales_data: salesData })
}

export default api
