import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Plus, CheckCircle2, AlertTriangle, Info,
  Loader2, X,
  ArrowRight, Brain, FlaskConical,
} from 'lucide-react'
import {
  createModel,
  addBenchmark,
  toSlug,
} from '../services/benchmarkService'
import { validateFieldWithAI } from '../services/aiService'
import { auth } from '../firebase'

const MODEL_TYPES = ['image', 'text', 'multimodal', 'audio', 'finetuned', 'other']

const CATEGORIES = {
  image:      ['Object Detection', 'Image Classification', 'Semantic Segmentation', 'Instance Segmentation', 'Face Recognition', 'Image Generation', 'Depth Estimation', 'Other'],
  text:       ['Text Classification', 'Named Entity Recognition', 'Question Answering', 'Text Generation', 'Translation', 'Summarization', 'Sentiment Analysis', 'Other'],
  multimodal: ['Visual QA', 'Image Captioning', 'Document Understanding', 'Other'],
  audio:      ['Speech Recognition', 'Speaker Identification', 'Audio Classification', 'Other'],
  finetuned:  ['LoRA / QLoRA', 'Full Fine-tune', 'Adapter Tuning', 'RLHF', 'DPO', 'Instruction Tuning', 'Domain Adaptation', 'Other'],
  other:      ['Other'],
}

const DATASET_TYPE_LABELS = {
  image:     ['image-dataset', 'zip-of-images', 'video-frames', 'custom'],
  text:      ['text-corpus', 'json-dataset', 'csv-dataset', 'benchmark-suite', 'custom'],
  finetuned: ['custom-train-set', 'instruction-dataset', 'preference-pairs', 'domain-corpus', 'benchmark-suite', 'custom'],
}

// ─── Custom Hook: Debounced AI Field Validation ──────────────────────────────
/**
 * Validates a field value using Cloudflare AI after user stops typing.
 * @param {string} fieldName - The field to validate ('modelName', 'dataset', 'hardwareInfo', 'baseModel')
 * @param {string} value - The current value
 * @param {number} debounceMs - Milliseconds to wait after typing stops (default 800ms)
 * @returns {{ validating: boolean, warning: string|null }}
 */
function useAIFieldValidation(fieldName, value, debounceMs = 800) {
  const [validating, setValidating] = useState(false)
  const [warning, setWarning] = useState(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Clear previous warning and timeout when value changes
    setWarning(null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Don't validate empty values
    if (!value || value.trim().length < 3) {
      setValidating(false)
      return
    }

    // Start debounce timer
    setValidating(true)
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await validateFieldWithAI(fieldName, value.trim())
        if (!result.ok && result.warning) {
          setWarning(result.warning)
        }
      } catch (err) {
        // Worker unavailable or error — silently ignore
        console.warn('AI validation failed:', err)
      } finally {
        setValidating(false)
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [fieldName, value, debounceMs])

  return { validating, warning }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddBenchmarkPage({ models }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedSlug = searchParams.get('model')

  // Step: 'model-search' | 'confirm-duplicate' | 'add-benchmark' | 'done'
  const [step, setStep] = useState(preselectedSlug ? 'add-benchmark' : 'model-search')

  // Model search / selection
  const [modelNameInput, setModelNameInput] = useState('')
  const [selectedModelType, setSelectedModelType] = useState('image')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [duplicateModel, setDuplicateModel] = useState(null)   // existing model match
  const [targetModel, setTargetModel] = useState(null)          // final model to add benchmark to

  // Pre-select from URL param
  useEffect(() => {
    if (preselectedSlug) {
      const m = models.find(m => m.slug === preselectedSlug)
      if (m) { setTargetModel(m); setStep('add-benchmark') }
    }
  }, [preselectedSlug, models])

  // Fuzzy match against existing models — catches near-duplicates
  function findExistingMatch(name) {
    const norm = name.toLowerCase().replace(/[\s\-_.\/]/g, '')
    
    for (const m of models) {
      const mNorm = m.name.toLowerCase().replace(/[\s\-_.\/]/g, '')
      
      // Exact normalized match
      if (mNorm === norm) return m
      
      // Slug match
      if (m.slug === toSlug(name)) return m
      
      // One contains the other (e.g., "Tesseract OCR" contains "Tesseract")
      if (norm.includes(mNorm) || mNorm.includes(norm)) return m
      
      // Version-agnostic match (e.g., "YOLOv8" and "YOLOv8n")
      const baseNorm = norm.replace(/v?\d+.*$/, '')
      const baseMNorm = mNorm.replace(/v?\d+.*$/, '')
      if (baseNorm.length >= 4 && baseNorm === baseMNorm) return m
    }
    
    return null
  }

  function handleContinue() {
    if (!modelNameInput.trim() || !selectedCategory) return

    const existing = findExistingMatch(modelNameInput)
    if (existing) {
      setDuplicateModel(existing)
      setStep('confirm-duplicate')
      return
    }

    // Model doesn't exist — create it and go straight to benchmark form
    createNewModel()
  }

  function confirmAddToDuplicate() {
    setTargetModel(duplicateModel)
    setStep('add-benchmark')
  }

  async function createNewModel() {
    const modelData = {
      name: modelNameInput.trim(),
      type: selectedModelType,
      category: selectedCategory,
      creator: '',
      description: '',
      tags: [],
    }
    try {
      const slug = await createModel(modelData)
      const newModel = { ...modelData, id: slug, slug }
      setTargetModel(newModel)
      setStep('add-benchmark')
    } catch (err) {
      alert('Failed to create model: ' + err.message)
    }
  }

  if (step === 'model-search') {
    return (
      <ModelSearchStep
        modelNameInput={modelNameInput}
        setModelNameInput={setModelNameInput}
        selectedModelType={selectedModelType}
        setSelectedModelType={setSelectedModelType}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onContinue={handleContinue}
      />
    )
  }

  if (step === 'confirm-duplicate') {
    return (
      <ConfirmDuplicateStep
        existing={duplicateModel}
        inputName={modelNameInput}
        onAddToExisting={confirmAddToDuplicate}
        onCreateNew={createNewModel}
        onBack={() => setStep('model-search')}
      />
    )
  }

  if (step === 'add-benchmark') {
    return (
      <BenchmarkFormStep
        model={targetModel}
        onDone={(modelSlug) => navigate(`/model/${modelSlug}`)}
        onBack={() => setStep('model-search')}
      />
    )
  }

  return null
}

// ─── Step 1: Search / enter model name ───────────────────────────────────────
function ModelSearchStep({
  modelNameInput, setModelNameInput,
  selectedModelType, setSelectedModelType,
  selectedCategory, setSelectedCategory,
  onContinue,
}) {
  // Get categories for the selected model type
  const availableCategories = CATEGORIES[selectedModelType] || CATEGORIES.other

  // AI validation state
  const [aiValidating, setAiValidating] = useState(false)
  const [aiWarning, setAiWarning] = useState(null)
  const validationTimeout = useRef(null)

  // Reset category when model type changes
  useEffect(() => {
    setSelectedCategory('')
    setAiWarning(null)
  }, [selectedModelType, setSelectedCategory])

  // AI validate the combination when all three are filled
  useEffect(() => {
    setAiWarning(null)
    if (validationTimeout.current) clearTimeout(validationTimeout.current)

    // Only validate when all fields have values
    if (!modelNameInput.trim() || modelNameInput.trim().length < 2 || !selectedCategory) {
      setAiValidating(false)
      return
    }

    setAiValidating(true)
    validationTimeout.current = setTimeout(async () => {
      try {
        const result = await validateFieldWithAI('modelTypeCategory', selectedCategory, {
          modelName: modelNameInput.trim(),
          modelType: selectedModelType,
        })
        if (!result.ok && result.warning) {
          setAiWarning(result.warning)
        }
      } catch (err) {
        console.warn('AI validation failed:', err)
      } finally {
        setAiValidating(false)
      }
    }, 800)

    return () => {
      if (validationTimeout.current) clearTimeout(validationTimeout.current)
    }
  }, [modelNameInput, selectedModelType, selectedCategory])

  function handleKey(e) {
    if (e.key === 'Enter' && modelNameInput.trim() && selectedCategory && !aiValidating) onContinue()
  }
  
  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Add Benchmark</h1>
        <p className="text-gray-400 mt-1">Start by entering the model details.</p>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="label">Model Name *</label>
          <input
            value={modelNameInput}
            onChange={e => setModelNameInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. YOLOv8, GPT-4, Whisper Large v3…"
            className="input"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Model Type *</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {MODEL_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedModelType(t)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  selectedModelType === t
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Category *</label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="input"
          >
            <option value="">-- Select a category --</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose the specific task category for this model
          </p>
        </div>

        {/* AI validation feedback */}
        {aiValidating && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700">
            <Loader2 size={16} className="animate-spin text-brand-400" />
            <p className="text-sm text-gray-400">Validating with AI…</p>
          </div>
        )}
        {aiWarning && !aiValidating && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
            <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-300">{aiWarning}</p>
          </div>
        )}

        <button
          onClick={onContinue}
          disabled={!modelNameInput.trim() || !selectedCategory || aiValidating || !!aiWarning}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowRight size={16} /> Continue
        </button>
      </div>
    </div>
  )
}

// ─── Step 2a: Duplicate found ─────────────────────────────────────────────────
function ConfirmDuplicateStep({ existing, inputName, onAddToExisting, onCreateNew, onBack }) {
  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <button onClick={onBack} className="btn-ghost text-sm mb-6">← Back</button>

      <div className="card p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Model Already Exists</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              We found an existing entry for <strong className="text-white">"{existing.name}"</strong>.
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="font-semibold text-white">{existing.name}</p>
          <p className="text-sm text-gray-400">{existing.creator || 'Unknown creator'}</p>
          {existing.description && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{existing.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="badge bg-gray-700 text-gray-300 border border-gray-600">{existing.type}</span>
            {existing.category && (
              <span className="badge bg-gray-700 text-gray-300 border border-gray-600">{existing.category}</span>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-4">What would you like to do?</p>

        <div className="space-y-3">
          <button
            onClick={onAddToExisting}
            className="btn-primary w-full flex items-center justify-between px-4 py-3"
          >
            <span>Add a new benchmark run to "{existing.name}"</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onCreateNew}
            className="btn-secondary w-full flex items-center justify-between px-4 py-3"
          >
            <span>No, create a separate new entry</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Benchmark form ───────────────────────────────────────────────────
function BenchmarkFormStep({ model, onDone, onBack }) {
  const currentUser = auth.currentUser
  const defaultAddedBy = currentUser
    ? (currentUser.displayName || currentUser.email || '')
    : ''

  const [form, setForm] = useState({
    latency: '',
    accuracy: '',
    dataset: '',
    datasetType: '',
    hardwareInfo: '',
    architectureUnderstanding: '',
    notes: '',
    addedBy: defaultAddedBy,
    tags: '',
    // Fine-tuning specific fields
    baseModel: '',
    finetuneMethod: '',
    trainingDataset: '',
    epochs: '',
    learningRate: '',
    finetuneFramework: '',
    comparisonToBase: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const modelType = (model?.type || 'other').toLowerCase()
  const isImageModel = modelType === 'image' || modelType === 'multimodal'
  const isFinetunedModel = modelType === 'finetuned'
  const datasetTypes = DATASET_TYPE_LABELS[modelType] || DATASET_TYPE_LABELS[isImageModel ? 'image' : 'text'] || DATASET_TYPE_LABELS.text

  // AI validation hooks
  const datasetValidation = useAIFieldValidation('dataset', form.dataset)
  const hardwareValidation = useAIFieldValidation('hardwareInfo', form.hardwareInfo)
  const baseModelValidation = useAIFieldValidation('baseModel', form.baseModel)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.latency || isNaN(Number(form.latency)) || Number(form.latency) < 0)
      errs.latency = 'Enter a valid latency in ms (≥ 0)'
    if (!form.accuracy || isNaN(Number(form.accuracy)) || Number(form.accuracy) < 0 || Number(form.accuracy) > 100)
      errs.accuracy = 'Enter a valid accuracy score (0–100)'
    if (!form.dataset.trim())
      errs.dataset = 'Describe the dataset used'
    return errs
  }

  // Check if all required validations have passed
  const isValidationPending = 
    (form.dataset.trim().length >= 3 && datasetValidation.validating) ||
    (form.hardwareInfo.trim().length >= 3 && hardwareValidation.validating) ||
    (isFinetunedModel && form.baseModel.trim().length >= 3 && baseModelValidation.validating)

  const hasValidationWarnings = 
    (form.dataset.trim() && datasetValidation.warning) ||
    (form.hardwareInfo.trim() && hardwareValidation.warning) ||
    (isFinetunedModel && form.baseModel.trim() && baseModelValidation.warning)

  // Check if required fields are filled
  const requiredFieldsFilled = form.latency && form.accuracy && form.dataset.trim()

  // Disable submit if validations are pending, if there are warnings, or if required fields not filled
  const canSubmit = requiredFieldsFilled && !isValidationPending && !hasValidationWarnings

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    
    // Double-check validation state before submitting
    if (!canSubmit) {
      alert('Please resolve all validation warnings before submitting.')
      return
    }
    
    setSaving(true)

    try {
      const tags = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      await addBenchmark(model.id, {
        latency:                    Number(form.latency),
        accuracy:                   Number(form.accuracy),
        dataset:                    form.dataset.trim(),
        datasetType:                form.datasetType,
        hardwareInfo:               form.hardwareInfo.trim(),
        architectureUnderstanding:  form.architectureUnderstanding.trim(),
        notes:                      form.notes.trim(),
        addedBy:                    form.addedBy.trim(),
        addedByUid:                 auth.currentUser?.uid || null,
        tags,
        // Fine-tuning fields (only saved when applicable)
        ...(isFinetunedModel && {
          baseModel:        form.baseModel.trim(),
          finetuneMethod:   form.finetuneMethod.trim(),
          trainingDataset:  form.trainingDataset.trim(),
          epochs:           form.epochs ? Number(form.epochs) : null,
          learningRate:     form.learningRate.trim(),
          finetuneFramework: form.finetuneFramework.trim(),
          comparisonToBase: form.comparisonToBase.trim(),
        }),
      })

      onDone(model.slug || model.id)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button onClick={onBack} className="btn-ghost text-sm mb-6">← Back</button>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Add Benchmark Run</h1>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-400 text-sm">Model:</span>
          <span className="text-white font-medium">{model?.name}</span>
          <span className="badge bg-gray-800 text-gray-400 border border-gray-700">{model?.type}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Metrics card */}
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4">Performance Metrics *</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Latency (ms) *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.latency}
                onChange={e => set('latency', e.target.value)}
                placeholder="e.g. 45.2"
                className={`input ${errors.latency ? 'border-red-500' : ''}`}
              />
              {errors.latency && <p className="text-xs text-red-400 mt-1">{errors.latency}</p>}
              <p className="text-xs text-gray-500 mt-1">Average inference time in milliseconds</p>
            </div>

            <div>
              <label className="label">
                {isImageModel ? 'Average Confidence / mAP (%)' : 'Accuracy / F1 Score (%)'} *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.accuracy}
                onChange={e => set('accuracy', e.target.value)}
                placeholder="e.g. 87.5"
                className={`input ${errors.accuracy ? 'border-red-500' : ''}`}
              />
              {errors.accuracy && <p className="text-xs text-red-400 mt-1">{errors.accuracy}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {isImageModel
                  ? 'Mean average precision or average confidence score'
                  : 'Accuracy, F1, BLEU, or other 0–100 metric'}
              </p>
            </div>
          </div>
        </div>

        {/* Dataset card */}
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4">Dataset Information *</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Dataset Description *</label>
              <div className="relative">
                <input
                  value={form.dataset}
                  onChange={e => set('dataset', e.target.value)}
                  placeholder={isImageModel
                    ? 'e.g. COCO val2017, custom 500-image set of street scenes'
                    : 'e.g. SQuAD 2.0, custom QA dataset from product docs'}
                  className={`input ${errors.dataset ? 'border-red-500' : ''}`}
                />
                {datasetValidation.validating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-brand-400" />
                  </div>
                )}
              </div>
              {errors.dataset && <p className="text-xs text-red-400 mt-1">{errors.dataset}</p>}
              {datasetValidation.warning && !errors.dataset && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-300">{datasetValidation.warning}</p>
                </div>
              )}
            </div>

            <div>
              <label className="label">Dataset Type</label>
              <div className="flex flex-wrap gap-2">
                {datasetTypes.map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => set('datasetType', dt)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.datasetType === dt
                        ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fine-tuning details card — only shown for finetuned models */}
        {isFinetunedModel && (
          <div className="card p-5 border border-orange-500/20">
            <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
              <FlaskConical size={16} className="text-orange-400" />
              Fine-tuning Details
            </h2>
            <p className="text-xs text-gray-500 mb-4">Provide details about how the model was fine-tuned and its comparison to the base model.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Base Model *</label>
                <div className="relative">
                  <input
                    value={form.baseModel}
                    onChange={e => set('baseModel', e.target.value)}
                    placeholder="e.g. Llama-3.1-8B, YOLOv8n, Whisper-large-v3"
                    className="input"
                  />
                  {baseModelValidation.validating && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-brand-400" />
                    </div>
                  )}
                </div>
                {baseModelValidation.warning && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-300">{baseModelValidation.warning}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">The original pre-trained model you fine-tuned from</p>
              </div>
              <div>
                <label className="label">Fine-tuning Method *</label>
                <input
                  value={form.finetuneMethod}
                  onChange={e => set('finetuneMethod', e.target.value)}
                  placeholder="e.g. LoRA r=16 alpha=32, Full fine-tune, QLoRA 4-bit"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Method/technique used (LoRA, QLoRA, full, adapter, etc.)</p>
              </div>
              <div>
                <label className="label">Training Dataset</label>
                <input
                  value={form.trainingDataset}
                  onChange={e => set('trainingDataset', e.target.value)}
                  placeholder="e.g. 10k custom labeled samples, domain-specific QA pairs"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Dataset used for fine-tuning (not eval — that goes in benchmark dataset)</p>
              </div>
              <div>
                <label className="label">Fine-tuning Framework</label>
                <input
                  value={form.finetuneFramework}
                  onChange={e => set('finetuneFramework', e.target.value)}
                  placeholder="e.g. Hugging Face PEFT, Axolotl, Unsloth, OpenAI API"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Epochs</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.epochs}
                  onChange={e => set('epochs', e.target.value)}
                  placeholder="e.g. 3"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Learning Rate</label>
                <input
                  value={form.learningRate}
                  onChange={e => set('learningRate', e.target.value)}
                  placeholder="e.g. 2e-4, 5e-5"
                  className="input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Comparison to Base Model</label>
                <textarea
                  rows={3}
                  value={form.comparisonToBase}
                  onChange={e => set('comparisonToBase', e.target.value)}
                  placeholder="How does your fine-tuned model compare to the base model? e.g. +5.2% accuracy on domain task, 30% faster inference due to quantization, improved F1 from 78.1 → 86.4 on internal test set…"
                  className="input resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Summarize improvement or regression vs. the original base model</p>
              </div>
            </div>
          </div>
        )}

        {/* Meta card */}
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4">Additional Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Hardware / Compute</label>
              <div className="relative">
                <input
                  value={form.hardwareInfo}
                  onChange={e => set('hardwareInfo', e.target.value)}
                  placeholder="e.g. NVIDIA A100 80GB, M2 Pro"
                  className="input"
                />
                {hardwareValidation.validating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-brand-400" />
                  </div>
                )}
              </div>
              {hardwareValidation.warning && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-300">{hardwareValidation.warning}</p>
                </div>
              )}
            </div>
            <div>
              <label className="label">Added By</label>
              <input
                value={form.addedBy}
                onChange={e => set('addedBy', e.target.value)}
                placeholder="Your name or team"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-filled from your account</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5">
                <Brain size={13} className="text-brand-400" />
                Architecture Understanding *
              </label>
              <textarea
                rows={4}
                value={form.architectureUnderstanding}
                onChange={e => set('architectureUnderstanding', e.target.value)}
                placeholder="Describe your understanding of this model's architecture — e.g. backbone type, training strategy, key design choices, loss functions, or anything notable about how the model works…"
                className="input resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Explain the model architecture in your own words. This helps the team understand the submitter's depth of knowledge.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Tags (comma-separated)</label>
              <input
                value={form.tags}
                onChange={e => set('tags', e.target.value)}
                placeholder="e.g. production, edge-device, low-light"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use-case or scenario tags for this specific run
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any additional context, preprocessing steps, or caveats…"
                className="input resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            isValidationPending 
              ? 'AI validation in progress...' 
              : hasValidationWarnings 
              ? 'Please resolve validation warnings' 
              : ''
          }
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving…</>
          ) : isValidationPending ? (
            <><Loader2 size={18} className="animate-spin" /> Validating with AI…</>
          ) : (
            <><CheckCircle2 size={18} /> Save Benchmark Run</>
          )}
        </button>
        
        {/* Validation status message */}
        {(isValidationPending || hasValidationWarnings || !requiredFieldsFilled) && !saving && (
          <div className="text-center">
            {isValidationPending && (
              <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                AI is validating your inputs...
              </p>
            )}
            {!isValidationPending && hasValidationWarnings && (
              <p className="text-sm text-orange-400 flex items-center justify-center gap-2">
                <AlertTriangle size={14} />
                Please resolve validation warnings above to submit
              </p>
            )}
            {!isValidationPending && !hasValidationWarnings && !requiredFieldsFilled && (
              <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                <Info size={14} />
                Fill in required fields (Latency, Accuracy, Dataset) to continue
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
