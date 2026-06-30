import React, { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, ChevronRight, ChevronDown, ChevronUp, FileSpreadsheet, Trophy } from 'lucide-react'

// Abbreviated category labels for compact sidebar display
const CATEGORY_ABBREV = {
  'Object Detection':           'OBJ',
  'Image Classification':       'CLS',
  'Semantic Segmentation':      'SEG',
  'Instance Segmentation':      'ISEG',
  'Face Recognition':           'FACE',
  'Image Generation':           'GEN',
  'Depth Estimation':           'DEPTH',
  'Text Classification':        'TCLS',
  'Named Entity Recognition':   'NER',
  'Question Answering':         'QA',
  'Text Generation':            'TGEN',
  'Translation':                'TRANS',
  'Summarization':              'SUM',
  'Sentiment Analysis':         'SENT',
  'Visual QA':                  'VQA',
  'Image Captioning':           'CAP',
  'Document Understanding':     'DOC',
  'Speech Recognition':         'ASR',
  'Speaker Identification':     'SPKR',
  'Audio Classification':       'ACLS',
  'Multimodal OCR':             'OCR',
  'LoRA / QLoRA':               'LORA',
  'Full Fine-tune':             'FULL-FT',
  'Adapter Tuning':             'ADAPT',
  'RLHF':                       'RLHF',
  'DPO':                        'DPO',
  'Instruction Tuning':         'INSTRUCT',
  'Domain Adaptation':          'DOMAIN',
  'Other':                      'OTHER',
}

export default function Sidebar({ models, open, onClose }) {
  const location = useLocation()
  const [expandedCategories, setExpandedCategories] = useState({})

  // Group by category and get top 3 by accuracy for each
  const categoryGroups = useMemo(() => {
    const groups = {}
    
    // Group models by category
    for (const m of models) {
      const cat = m.category || 'Uncategorized'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(m)
    }

    // Sort each category by _latestAccuracy descending and take top 3
    const result = {}
    for (const [cat, items] of Object.entries(groups)) {
      const sorted = [...items].sort((a, b) => {
        const accA = a._latestAccuracy ?? -1
        const accB = b._latestAccuracy ?? -1
        return accB - accA
      })
      result[cat] = {
        all: sorted,
        top3: sorted.slice(0, 3),
        total: sorted.length,
      }
    }

    return result
  }, [models])

  const totalCategories = Object.keys(categoryGroups).length

  function toggleCategory(cat) {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 shrink-0 bg-gray-900 border-r border-gray-800
        flex flex-col
        transition-transform duration-300
        h-[calc(100vh-3.5rem)] lg:h-auto lg:max-h-[calc(100vh-3.5rem)]
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Mobile close */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-800 lg:hidden">
        <span className="font-semibold text-sm text-gray-300">Models</span>
        <button onClick={onClose} className="btn-ghost p-1.5">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-3">
        {/* Quick stats */}
        <div className="px-4 mb-4">
          <div className="bg-gray-800/60 rounded-lg p-3 grid grid-cols-2 gap-2 text-center">
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
        {Object.entries(categoryGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, { all, top3, total }]) => {
            const isExpanded = expandedCategories[category]
            const displayModels = isExpanded ? all : [] // Changed: show nothing when collapsed
            const abbrev = CATEGORY_ABBREV[category] || category.substring(0, 4).toUpperCase()

            return (
              <div key={category} className="mb-3">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/60 transition-colors group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-bold text-brand-400 font-mono w-10 shrink-0">
                      {abbrev}
                    </span>
                    <span className="text-xs font-semibold text-gray-300 truncate">
                      {category}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">{total}</span>
                  {isExpanded ? (
                    <ChevronUp size={13} className="text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown size={13} className="text-gray-500 shrink-0" />
                  )}
                </button>

                {/* Models in category - only shown when expanded */}
                {isExpanded && displayModels.length > 0 && (
                  <div className="space-y-0.5">
                    {displayModels.map((model, idx) => {
                      const active = location.pathname === `/model/${model.slug}`
                      return (
                        <Link
                          key={model.id}
                          to={`/model/${model.slug}`}
                          onClick={onClose}
                          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-brand-600/15 text-brand-300 border-r-2 border-brand-500'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                          }`}
                        >
                          <span className="flex-1 truncate pl-2">{model.name}</span>
                          {model._latestAccuracy != null && (
                            <span className="text-xs text-emerald-400 font-mono shrink-0">
                              {model._latestAccuracy.toFixed(1)}%
                            </span>
                          )}
                          <ChevronRight size={13} className="shrink-0 opacity-40" />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

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
      <div className="shrink-0 p-3 border-t border-gray-800 space-y-2">
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
