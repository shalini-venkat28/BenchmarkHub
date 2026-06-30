/**
 * Cloudflare Worker AI service client
 */

const BASE_URL = import.meta.env.VITE_CF_WORKER_URL || ''

// Debug: log the worker URL at load time
console.log('[AI Service] Worker URL:', BASE_URL || '⚠️ EMPTY - check .env VITE_CF_WORKER_URL')

async function post(endpoint, body) {
  const url = `${BASE_URL}${endpoint}`
  console.log('[AI Service] POST', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Validate / identify a model name using Cloudflare AI.
 * @param {string} modelName
 * @param {string} modelType  'image' | 'text' | 'multimodal' | 'audio' | 'other'
 * @returns {Promise<{isKnown, confidence, canonicalName, creator, description, suggestion}>}
 */
export async function validateModelWithAI(modelName, modelType) {
  return post('/validate-model', { modelName, modelType })
}

/**
 * Send a chat message with optional benchmark context.
 * @param {string} message
 * @param {any[]} benchmarkContext  array of model objects from Firestore
 * @returns {Promise<{reply: string}>}
 */
export async function sendChatMessage(message, benchmarkContext) {
  return post('/chat', { message, context: benchmarkContext })
}

/**
 * Validate a specific form field using Cloudflare AI.
 * @param {string} fieldName  'modelName' | 'dataset' | 'hardwareInfo' | 'baseModel'
 * @param {string} value  The field value to validate
 * @param {object} context  Optional additional context
 * @returns {Promise<{ok: boolean, warning: string|null, suggestion: string}>}
 */
export async function validateFieldWithAI(fieldName, value, context = {}) {
  return post('/validate-field', { fieldName, value, context })
}
