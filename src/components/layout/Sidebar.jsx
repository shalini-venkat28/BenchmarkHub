import React, { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, ChevronRight, ChevronDown, ChevronUp, FileSpreadsheet, Layers } from 'lucide-react'

// Known categories with clean display names and icons
const KNOWN_CATEGORIES = [
  'Object Detection',
  'Image Classification',
  'Semantic Segmentation',
  'Instance Segmentation',
  'Face Recognition',
  'Image Generation',
  'Depth Estimation',
  'OCR',
  'Document Understanding',
  'Text Classification',
  'Named Entity Recognition',
  'Question Answering',
  'Text Generation',
  'Translation',
  'Summarization',
  'Sentiment Analysis',
  'Visual QA',
  'Image Captioning',
  'Speech Recognition',
  'Speaker Identification',
  'Audio Classification',
  'LoRA / QLoRA',
  'Full Fine-tune',
  'Adapter Tuning',
  'RLHF',
  'DPO',
  'Instruction Tuning',
  'Domain Adaptation',
]

/**
 * Normalize a category string to match a known category.
 * Handles messy freeform text like "OCR, document parsing" → "OCR"
 */
function normalizeCategory(raw) {
  if (!raw || raw === 'Uncategorized') return 'Uncategorized'
  
  const lower = raw.toLowerCase().trim()
  
  // Direct match
  const directMatch = KNOWN_CATEGORIES.find(k => k.toLowerCase() === lower)
  if (directMatch) return directMatch

  // Partial match — if the raw category starts with or contains a known category
  for (const known of KNOWN_CATEGORIES) {
    const knownLower = known.toLowerCase()
    if (lower.startsWith(knownLower) || lower.includes(knownLower)) {
      return known
    }
    // Also check if known starts with the raw (e.g. "obj" → "Object Detection")
    if (knownLower.startsWith(lower)) {
      return known
    }
  }

  // Check common abbreviations
  const abbrevMap = {
    'ocr': 'OCR',
    'obj': 'Object Detection',
    'seg': 'Semantic Segmentation',
    'cls': 'Image Classification',
    'det': 'Object Detection',
    'gen': 'Image Generation',
    'qa': 'Question Answering',
    'ner': 'Named Entity Recognition',
    'asr': 'Speech Recognition',
    'multimodal extraction': 'OCR',
    'multimodal': 'Visual QA',
  }
  
  for (const [abbr, full] of Object.entries(abbrevMap)) {
    if (lower.includes(abbr)) return full
  }

  // Fallback — capitalize first letter
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function Sidebar({ models, open, onClose }) {
  const location = useLocation()
  const [expandedCategories, setExpandedCategories] = useState({})

  // Group models by normalized category
  const categoryGroups = useMemo(() => {
    const groups = {}
    
    for (const m of models) {
      const cat = normalizeCategory(m.category)
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(m)
    }

    // Sort each category by accuracy descending
    const result = {}
    for (const [cat, items] of Object.entries(groups)) {
      const sorted = [...items].sort((a, b) => {
        const accA = a._latestAccuracy ?? -1
        const accB = b._latestAccuracy ?? -1
        return accB - accA
      })
      result[cat] = {
        all: sorted,
        total: sorted.length,
      }
    }

    return result
  }, [models])

  // Sort categories: known ones first (in order), then unknowns, then Uncategorized last
  const sortedCategories = useMemo(() => {
    const entries = Object.entries(categoryGroups)
    return entries.sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1
      if (b === 'Uncategorized') return -1
      const aIdx = KNOWN_CATEGORIES.indexOf(a)
      const bIdx = KNOWN_CATEGORIES.indexOf(b)
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
      if (aIdx !== -1) return -1
      if (bIdx !== -1) return 1
      return a.localeCompare(b)
    })
  }, [categoryGroups])

  const totalCategories = sortedCategories.length

  function toggleCategory(cat) {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 shrink-0 bg-white/[0.02] backdrop-blur-2xl border-r border-white/[0.08]
        flex flex-col h-full
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Mobile close */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.08] lg:hidden">
        <span className="font-semibold text-sm text-gray-300">Models</span>
        <button onClick={onClose} className="btn-ghost p-1.5">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-3">
        {/* Quick stats */}
        <div className="px-4 mb-4">
          <div className="glass-subtle p-3 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-white">{models.length}</p>
              <p className="text-xs text-gray-500">Models</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{totalCategories}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
          </div>
        </div>

        {/* Category groups */}
        <div className="px-2">
          {sortedCategories.map(([category, { all, total }]) => {
            const isExpanded = expandedCategories[category]

            return (
              <div key={category} className="mb-1">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all duration-200 group"
                >
                  <Layers size={14} className="text-brand-400 shrink-0 opacity-70 group-hover:opacity-100" />
                  <span className="text-sm font-medium text-gray-200 flex-1 text-left truncate">
                    {category}
                  </span>
                  <span className="text-xs text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
                    {total}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={14} className="text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-500 shrink-0" />
                  )}
                </button>

                {/* Models in category - only shown when expanded */}
                {isExpanded && all.length > 0 && (
                  <div className="ml-3 pl-3 border-l border-white/[0.06] space-y-0.5 mt-1 mb-2">
                    {all.map((model) => {
                      const active = location.pathname === `/model/${model.slug}`
                      return (
                        <Link
                          key={model.id}
                          to={`/model/${model.slug}`}
                          onClick={onClose}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            active
                              ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="flex-1 truncate">{model.name}</span>
                          {model._latestAccuracy != null && (
                            <span className="text-xs text-emerald-400/80 font-mono shrink-0">
                              {model._latestAccuracy.toFixed(1)}%
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {models.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-600 text-sm">
            No models yet.<br />
            <Link to="/add" className="text-brand-400 hover:text-brand-300 mt-1 inline-block">
              Add the first one →
            </Link>
          </div>
        )}
      </div>

      {/* Add new */}
      <div className="shrink-0 p-3 border-t border-white/[0.08] space-y-2">
        <Link
          to="/add"
          onClick={onClose}
          className="btn-primary w-full text-sm text-center block"
        >
          + Add Benchmark
        </Link>
        <Link
          to="/bulk-import"
          onClick={onClose}
          className="btn-secondary w-full text-sm text-center flex items-center justify-center gap-2"
        >
          <FileSpreadsheet size={14} />
          Bulk Import
        </Link>
      </div>
    </aside>
  )
}
