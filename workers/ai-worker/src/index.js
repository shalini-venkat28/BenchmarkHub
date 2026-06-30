/**
 * Cloudflare Worker — Benchmark Hub AI Backend
 *
 * Endpoints:
 *   POST /validate-model   — Confirm if a model name is known/new via AI
 *   POST /chat             — Chatbot RAG-style: answer questions about benchmarks
 *   OPTIONS  *             — CORS preflight
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// ─── Model validation ─────────────────────────────────────────────────────────
async function validateModel(env, modelName, modelType) {
  const prompt = `You are an AI model knowledge base assistant.

A user wants to add a benchmark entry for a model named: "${modelName}"
Model type category: ${modelType}

Your task:
1. Determine if "${modelName}" is a KNOWN, publicly documented AI model.
2. If it IS known, confirm its name, creator, and typical use-case in 1-2 sentences.
3. If it is NOT known or seems like a typo / custom internal model, say so clearly.

Respond in JSON with this exact structure:
{
  "isKnown": true | false,
  "confidence": 0.0-1.0,
  "canonicalName": "exact or corrected model name, or null",
  "creator": "company/org name, or null",
  "description": "brief description, or null",
  "suggestion": "human-readable message to show the user"
}`

  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
  })

  const text = response.response || ''

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (_) {}
  }

  // Fallback if JSON parse fails
  return {
    isKnown: null,
    confidence: 0,
    canonicalName: null,
    creator: null,
    description: null,
    suggestion: text.trim() || 'Could not determine model information.',
  }
}

// ─── Chatbot (RAG-style with provided context) ────────────────────────────────
async function chat(env, userMessage, benchmarkContext) {
  // Build a context string from the benchmark data passed from the frontend
  const contextStr = benchmarkContext
    ? `Here is the current benchmark data from the database:\n\n${JSON.stringify(benchmarkContext, null, 2)}\n\n`
    : ''

  const systemPrompt = `You are a helpful AI assistant for the Model Benchmark Hub — a platform that tracks performance benchmarks of AI/ML models.

${contextStr}
You help users understand:
- Model performance comparisons (latency, accuracy/confidence scores)
- Which models perform best for specific tasks
- Trends across model categories (image classification, object detection, NLP, etc.)
- How to interpret benchmark metrics
- Dataset and inference methodology questions

Be concise, data-driven, and helpful. If a user asks about a specific model or metric and data is available in the context above, reference it directly.
If data is not available, say so honestly and provide general guidance.`

  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 600,
    stream: false,
  })

  return response.response || "I couldn't generate a response. Please try again."
}

// ─── Field-by-field validation ────────────────────────────────────────────────
async function validateField(env, fieldName, value, context) {
  const prompts = {
    modelName: `Is "${value}" a real, publicly known AI/ML model? 
    
Answer ONLY with one of these formats:
- If YES (it's a real model): "✓ ${value} is a real model. [brief description]"
- If NO (not real/typo): "⚠️ ${value} is not a known model. [suggestion if applicable]"
- If UNCERTAIN: "⚠️ Cannot verify ${value}. [explanation]"

Be concise (max 2 sentences).`,
    
    modelTypeCategory: `A user is adding a benchmark for model "${context.modelName || ''}".
They selected:
- Model Type: "${context.modelType || ''}"
- Category: "${value}"

Is this type and category correct for model "${context.modelName || ''}"?

Answer ONLY with one of these formats:
- If CORRECT: "✓ Correct. [brief reason]"
- If WRONG: "⚠️ ${context.modelName || 'This model'} is actually a [correct type] model, typically used for [correct category]. Consider selecting [suggestion]."

Be concise (max 2 sentences).`,

    dataset: `Is "${value}" a valid/realistic dataset description for AI model benchmarking?

Answer ONLY with one of these formats:
- If YES (valid): "✓ Valid dataset description."
- If NO (invalid/vague): "⚠️ [explain the issue briefly]"

Be concise.`,
    
    hardwareInfo: `Is "${value}" realistic hardware/compute info for running AI model inference?

Answer ONLY with one of these formats:
- If YES (realistic): "✓ Valid hardware specification."
- If NO (unrealistic): "⚠️ [explain the issue briefly]"

Be concise.`,
    
    baseModel: `Is "${value}" a real base model that someone could fine-tune?

Answer ONLY with one of these formats:
- If YES (real model): "✓ ${value} is a real base model."
- If NO (not real): "⚠️ ${value} is not a known model. [suggestion if applicable]"

Be concise.`,

    architectureUnderstanding: `A user submitted this as their "Architecture Understanding" for an AI model benchmark:
"${value}"

Is this a meaningful technical description of a model architecture? It should mention things like backbone type, layers, attention mechanisms, training strategy, loss functions, or design choices.

Answer ONLY with one of these formats:
- If YES (meaningful technical content): "✓ Valid architecture description."
- If NO (gibberish/too vague/not technical): "⚠️ This doesn't appear to be a meaningful architecture description. Please describe the model's architecture (e.g., backbone, layers, training approach)."

Be concise.`,

    notes: `A user submitted this as "Notes" for an AI model benchmark entry:
"${value}"

Is this meaningful text that provides useful context about a benchmark run? It should be coherent English text.

Answer ONLY with one of these formats:
- If YES (meaningful): "✓ Valid notes."
- If NO (gibberish/random characters): "⚠️ This doesn't appear to be meaningful notes. Please provide actual context about the benchmark run."

Be concise.`,

    tags: `A user submitted these as tags for an AI model benchmark: "${value}"

Are these meaningful, relevant tags for an AI/ML benchmark? Tags should be descriptive words like "production", "edge-device", "low-light", "real-time", etc.

Answer ONLY with one of these formats:
- If YES (meaningful tags): "✓ Valid tags."
- If NO (gibberish/meaningless): "⚠️ These don't appear to be meaningful tags. Use descriptive terms like 'production', 'edge-device', 'real-time'."

Be concise.`,
  }

  const prompt = prompts[fieldName]
  if (!prompt) return { ok: true, warning: null }

  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      { role: 'system', content: 'You are a validator. Follow the format exactly. Use ✓ for valid, ⚠️ for issues.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 150,
  })

  const text = (response.response || '').trim()
  
  // Check if response starts with warning symbol (more reliable detection)
  const hasWarning = text.startsWith('⚠️') || text.startsWith('⚠')

  return {
    ok: !hasWarning,
    warning: hasWarning ? text.replace(/^⚠️?\s*/, '') : null,
    suggestion: text,
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    // ── POST /validate-model ──────────────────────────────────────────────────
    if (url.pathname === '/validate-model') {
      const { modelName, modelType } = body
      if (!modelName) return json({ error: 'modelName is required' }, 400)

      try {
        const result = await validateModel(env, modelName, modelType || 'unknown')
        return json(result)
      } catch (err) {
        return json({ error: 'AI validation failed', detail: err.message }, 500)
      }
    }

    // ── POST /chat ────────────────────────────────────────────────────────────
    if (url.pathname === '/chat') {
      const { message, context } = body
      if (!message) return json({ error: 'message is required' }, 400)

      try {
        const reply = await chat(env, message, context || null)
        return json({ reply })
      } catch (err) {
        return json({ error: 'Chat failed', detail: err.message }, 500)
      }
    }

    // ── POST /validate-field ──────────────────────────────────────────────────
    if (url.pathname === '/validate-field') {
      const { fieldName, value, context } = body
      if (!fieldName || !value) return json({ error: 'fieldName and value are required' }, 400)

      try {
        const result = await validateField(env, fieldName, value, context || {})
        return json(result)
      } catch (err) {
        return json({ error: 'Field validation failed', detail: err.message }, 500)
      }
    }

    return json({ error: 'Not found' }, 404)
  },
}
