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
  analyzeWorkflowStage: (manuscript, sectionInfo, workflowStage, goals, timeAway, ageGroup, projectId) =>
    api.post('/ai/workflow-stage', {
      manuscript,
      section_info: sectionInfo,
      workflow_stage: workflowStage,
      goals,
      time_away: timeAway,
      age_group: ageGroup,
      project_id: projectId
    }),
  analyzeTone: (content, projectId, chapterId, sectionInfo, intendedTone, goals, ageGroup) => 
    api.post('/ai/analyze-tone', { 
      content, 
      project_id: projectId, 
      chapter_id: chapterId,
      section_info: sectionInfo,
      intended_tone: intendedTone,
      goals: goals,
      age_group: ageGroup
    }),
  generateArtPrompts: (projectId, chapterId, stylePreset, promptType, context, artProfile) =>
    api.post('/ai/art-prompts', { 
      project_id: projectId, 
      chapter_id: chapterId, 
      style_preset: stylePreset, 
      prompt_type: promptType,
      context,
      art_profile: artProfile
    }),
  generateArtProfileSummary: (profile) =>
    api.post('/ai/art-profile-summary', profile),
  askThad: (query, context) => api.post('/ai/ask-thad', { query, context }),
  thadWelcome: (userName, bookTitle, ageGroup, theme, deviceType) =>
    api.post('/ai/thad/welcome', {
      user_name: userName,
      book_title: bookTitle,
      age_group: ageGroup,
      theme: theme,
      device_type: deviceType
    }),
  thadTour: (userName, bookTitle, ageGroup, theme, deviceType, currentStep) =>
    api.post('/ai/thad/tour', {
      user_name: userName,
      book_title: bookTitle,
      age_group: ageGroup,
      theme: theme,
      device_type: deviceType,
      current_step: currentStep
    })
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

// Import Analysis APIs
export const importAnalysisApi = {
  analyze: (content, filename, projectId, chapterId) =>
    api.post('/ai/import/analyze', { 
      content, 
      filename, 
      project_id: projectId, 
      chapter_id: chapterId 
    }),
  executeAction: (action, content, projectId, chapterId) =>
    api.post('/ai/import/action', { 
      action, 
      content, 
      project_id: projectId, 
      chapter_id: chapterId 
    }),
  splitAndCreateChapters: (content, projectId, manuscriptId) =>
    api.post('/ai/import/split-chapters', {
      content,
      project_id: projectId,
      manuscript_id: manuscriptId
    })
}

// ============== DATA COLLECTIONS APIs ==============

// Manuscripts Collection
export const manuscriptsApi = {
  getAll: () => api.get('/manuscripts-collection'),
  getById: (id) => api.get(`/manuscripts-collection/${id}`),
  create: (data) => api.post('/manuscripts-collection', data),
  update: (id, data) => api.put(`/manuscripts-collection/${id}`, data),
  delete: (id) => api.delete(`/manuscripts-collection/${id}`),
  getChapters: (id) => api.get(`/manuscripts-collection/${id}/chapters`)
}

// Versions Collection
export const versionsApi = {
  getByParent: (parentType, parentId) => api.get(`/versions/parent/${parentType}/${parentId}`),
  getById: (id) => api.get(`/versions/${id}`),
  create: (data) => api.post('/versions', data),
  delete: (id) => api.delete(`/versions/${id}`)
}

// Notes Collection
export const notesApi = {
  getByParent: (parentType, parentId) => api.get(`/notes/parent/${parentType}/${parentId}`),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`)
}

// Migration API
export const migrationApi = {
  migrateProjectsToManuscripts: () => api.post('/migrate/projects-to-manuscripts')
}

// Book Art Profile API
export const artProfileApi = {
  getByProject: (projectId) => api.get(`/art-profiles/project/${projectId}`),
  createOrUpdate: (data) => api.post('/art-profiles', data),
  update: (projectId, data) => api.put(`/art-profiles/project/${projectId}`, data)
}

// Writing Statistics API
export const statsApi = {
  logSession: (data) => api.post('/stats/session', data),
  getDailyStats: (date) => api.get(`/stats/daily/${date}`),
  getStreak: () => api.get('/stats/streak'),
  getOverview: () => api.get('/stats/overview'),
  getWeekly: () => api.get('/stats/weekly'),
  getMomentum: (dailyWords, weeklyWords, streak, totalWords, sessionMinutes, timeAway, goals, ageGroup) =>
    api.post('/ai/writing-momentum', {
      daily_words: dailyWords,
      weekly_words: weeklyWords,
      streak: streak,
      total_words: totalWords,
      session_minutes: sessionMinutes,
      time_away: timeAway,
      goals: goals,
      age_group: ageGroup
    })
}

// Import Manuscript Action
export const actionsApi = {
  importManuscript: (file, title = null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) {
      formData.append('title', title)
    }
    return api.post('/actions/import-manuscript', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export default api
