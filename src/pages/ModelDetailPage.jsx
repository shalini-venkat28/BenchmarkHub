import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Clock, Target, Database,
  FileImage, FileText, ExternalLink, ChevronDown, ChevronUp,
  Calendar, Server, Tag, Brain, User, Pencil, X, Save,
  Loader2, History, MessageSquare, FlaskConical,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { getBenchmarks, updateBenchmark } from '../services/benchmarkService'
import { auth } from '../firebase'

const TYPE_COLORS = {
  image:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  text:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  multimodal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  audio:      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  finetuned:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  other:      'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export default function ModelDetailPage({ models }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const model = models.find(m => m.slug === slug)
  const [benchmarks, setBenchmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    if (!model) return
    let alive = true
    setLoading(true)
    getBenchmarks(model.id).then(data => {
      if (alive) { setBenchmarks(data); setLoading(false) }
    }).catch(() => setLoading(false))
    return () => { alive = false }
  }, [model])

  function handleBenchmarkUpdated(updatedBenchmark) {
    setBenchmarks(prev =>
      prev.map(b => b.id === updatedBenchmark.id ? updatedBenchmark : b)
    )
    setEditingId(null)
  }

  if (!model) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Model not found.</p>
        <Link to="/" className="btn-primary mt-4 inline-block">← Back to dashboard</Link>
      </div>
    )
  }

  const typeColor = TYPE_COLORS[(model.type || 'other').toLowerCase()] || TYPE_COLORS.other

  const chartData = [...benchmarks].reverse().map((b, i) => ({
    name: `#${i + 1}`,
    Accuracy: b.accuracy,
    Latency: b.latency,
    date: b.createdAt?.toDate?.()?.toLocaleDateString?.() || `Run ${i + 1}`,
  }))

  const best = benchmarks.reduce((acc, b) => {
    if (!acc) return b
    return (b.accuracy || 0) > (acc.accuracy || 0) ? b : acc
  }, null)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft size={15} /> Back
        </button>
        <Link to={`/add?model=${slug}`} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={15} /> Add Benchmark Run
        </Link>
      </div>

      {/* Model header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-white">{model.name}</h1>
              <span className={`badge border ${typeColor}`}>{model.type}</span>
            </div>
            {model.creator && <p className="text-gray-400 text-sm">by {model.creator}</p>}
            {model.category && <p className="text-xs text-gray-500 mt-0.5">{model.category}</p>}
            {model.description && (
              <p className="text-gray-300 mt-3 text-sm leading-relaxed max-w-2xl">{model.description}</p>
            )}
            {model.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {model.tags.map(tag => (
                  <span key={tag} className="badge bg-gray-800 text-gray-400 border border-gray-700">
                    <Tag size={10} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <MetricPill label="Best Accuracy" value={best?.accuracy != null ? `${best.accuracy.toFixed(1)}%` : '—'} color="text-emerald-400" />
            <MetricPill label="Best Latency"  value={best?.latency  != null ? `${best.latency}ms`            : '—'} color="text-yellow-400" />
            <MetricPill label="Total Runs"    value={benchmarks.length}                                            color="text-brand-400"  />
            <MetricPill label="Datasets"      value={new Set(benchmarks.map(b => b.dataset)).size}                 color="text-purple-400" />
          </div>
        </div>
      </div>

      {/* Trend chart */}
      {chartData.length > 1 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Performance Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]}
                label={{ value: '% Accuracy', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}
                label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6', fontSize: '13px' }} />
              <Legend />
              <Line yAxisId="left"  type="monotone" dataKey="Accuracy" stroke="#34d399" strokeWidth={2} dot={{ r: 4, fill: '#34d399' }} />
              <Line yAxisId="right" type="monotone" dataKey="Latency"  stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, fill: '#fbbf24' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Benchmark runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Benchmark Runs ({benchmarks.length})</h2>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-gray-500">Loading…</div>
        ) : benchmarks.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500 mb-4">No benchmark runs yet.</p>
            <Link to={`/add?model=${slug}`} className="btn-primary text-sm">Add First Run</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {benchmarks.map((b, i) =>
              editingId === b.id ? (
                <EditBenchmarkCard
                  key={b.id}
                  benchmark={b}
                  index={i}
                  modelSlug={model.id}
                  modelType={model.type}
                  onSaved={handleBenchmarkUpdated}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <BenchmarkRunCard
                  key={b.id}
                  benchmark={b}
                  index={i}
                  expanded={expanded === b.id}
                  onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
                  onEdit={() => { setExpanded(null); setEditingId(b.id) }}
                  modelType={model.type}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Read-only benchmark card ─────────────────────────────────────────────────
function BenchmarkRunCard({ benchmark: b, index, expanded, onToggle, onEdit, modelType }) {
  const date = b.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Unknown date'
  const time = b.createdAt?.toDate?.()?.toLocaleTimeString?.() || ''
  const editDate = b.lastEditedAt?.toDate?.()?.toLocaleDateString?.() || null

  return (
    <div className="card overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-4 p-4 hover:bg-gray-800/40 transition-colors text-left"
        >
          <span className="text-xs font-mono text-gray-600 w-6 shrink-0">#{index + 1}</span>

          <div className="flex items-center gap-4 flex-1 flex-wrap">
            {b.accuracy != null && (
              <div className="flex items-center gap-1.5">
                <Target size={13} className="text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400 font-mono">{b.accuracy.toFixed(1)}%</span>
                <span className="text-xs text-gray-500">accuracy</span>
              </div>
            )}
            {b.latency != null && (
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400 font-mono">{b.latency}ms</span>
                <span className="text-xs text-gray-500">latency</span>
              </div>
            )}
            {b.dataset && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Database size={13} className="text-gray-500 shrink-0" />
                <span className="text-xs text-gray-400 truncate max-w-[200px]">{b.dataset}</span>
              </div>
            )}
            {/* Edit badge */}
            {b.lastEditedBy && (
              <span className="text-xs text-orange-400/70 flex items-center gap-1">
                <Pencil size={10} /> edited
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">{date}</span>
            {expanded ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
          </div>
        </button>

        {/* Edit button */}
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="px-3 py-4 text-gray-600 hover:text-brand-400 hover:bg-gray-800/40 transition-colors border-l border-gray-800 shrink-0"
          title="Edit this benchmark run"
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4 animate-fade-in">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <DetailRow icon={Calendar} label="Added On"   value={`${date} ${time}`} />
            {b.hardwareInfo && <DetailRow icon={Server}   label="Hardware"  value={b.hardwareInfo} />}
            {b.dataset      && <DetailRow icon={Database} label="Dataset"   value={b.dataset} />}
            {b.addedBy      && <DetailRow icon={User}     label="Added By"  value={b.addedBy} />}
          </div>

          {b.architectureUnderstanding && (
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Brain size={11} /> Architecture Understanding
              </p>
              <p className="text-gray-300 bg-gray-800 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {b.architectureUnderstanding}
              </p>
            </div>
          )}

          {/* Fine-tuning details */}
          {b.baseModel && (
            <div className="border border-orange-500/20 rounded-lg p-3 bg-orange-500/5">
              <p className="text-xs text-orange-400 mb-2 flex items-center gap-1.5 font-medium">
                <FlaskConical size={11} /> Fine-tuning Details
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Base Model:</span> <span className="text-gray-200">{b.baseModel}</span></div>
                {b.finetuneMethod && <div><span className="text-gray-500">Method:</span> <span className="text-gray-200">{b.finetuneMethod}</span></div>}
                {b.trainingDataset && <div><span className="text-gray-500">Training Data:</span> <span className="text-gray-200">{b.trainingDataset}</span></div>}
                {b.finetuneFramework && <div><span className="text-gray-500">Framework:</span> <span className="text-gray-200">{b.finetuneFramework}</span></div>}
                {b.epochs && <div><span className="text-gray-500">Epochs:</span> <span className="text-gray-200">{b.epochs}</span></div>}
                {b.learningRate && <div><span className="text-gray-500">Learning Rate:</span> <span className="text-gray-200">{b.learningRate}</span></div>}
              </div>
              {b.comparisonToBase && (
                <div className="mt-2 pt-2 border-t border-orange-500/10">
                  <p className="text-xs text-gray-500 mb-1">vs. Base Model:</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{b.comparisonToBase}</p>
                </div>
              )}
            </div>
          )}

          {b.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-gray-300 bg-gray-800 rounded-lg p-3 text-xs leading-relaxed">{b.notes}</p>
            </div>
          )}

          {b.fileUrl && (
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {modelType === 'image' ? 'Dataset Images / Archive' : 'Dataset File'}
              </p>
              <a href={b.fileUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-brand-400 hover:text-brand-300 bg-gray-800 rounded-lg px-3 py-2">
                {b.fileType?.startsWith('image/') ? <FileImage size={13} /> : <FileText size={13} />}
                {b.fileName || 'Download file'}
                <ExternalLink size={11} />
              </a>
            </div>
          )}

          {b.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {b.tags.map(tag => (
                <span key={tag} className="badge bg-gray-800 text-gray-400 border border-gray-700">{tag}</span>
              ))}
            </div>
          )}

          {/* Last edit info */}
          {b.lastEditedBy && (
            <div className="border-t border-gray-800 pt-3 space-y-1">
              <p className="text-xs text-orange-400/80 flex items-center gap-1.5">
                <Pencil size={11} />
                Last edited by <strong>{b.lastEditedBy}</strong>
                {editDate && <span className="text-gray-600">· {editDate}</span>}
              </p>
              {b.editComment && (
                <p className="text-xs text-gray-500 flex items-start gap-1.5 pl-4">
                  <MessageSquare size={10} className="shrink-0 mt-0.5" />
                  "{b.editComment}"
                </p>
              )}
            </div>
          )}

          {/* Edit history */}
          {b.editHistory?.length > 0 && (
            <EditHistorySection history={b.editHistory} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inline edit form ─────────────────────────────────────────────────────────
function EditBenchmarkCard({ benchmark: b, index, modelSlug, modelType, onSaved, onCancel }) {
  const currentUser = auth.currentUser
  const isImageModel = (modelType || '').toLowerCase() === 'image' || (modelType || '').toLowerCase() === 'multimodal'

  const [form, setForm] = useState({
    latency:                   String(b.latency ?? ''),
    accuracy:                  String(b.accuracy ?? ''),
    dataset:                   b.dataset || '',
    datasetType:               b.datasetType || '',
    hardwareInfo:              b.hardwareInfo || '',
    architectureUnderstanding: b.architectureUnderstanding || '',
    notes:                     b.notes || '',
    tags:                      (b.tags || []).join(', '),
  })
  const [editComment, setEditComment] = useState('')
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.latency  || isNaN(Number(form.latency))  || Number(form.latency) < 0)
      errs.latency  = 'Enter a valid latency in ms (≥ 0)'
    if (!form.accuracy || isNaN(Number(form.accuracy)) || Number(form.accuracy) < 0 || Number(form.accuracy) > 100)
      errs.accuracy = 'Enter a valid accuracy score (0–100)'
    if (!form.dataset.trim())
      errs.dataset  = 'Dataset description is required'
    if (!editComment.trim())
      errs.editComment = 'Please describe why you are editing this entry'
    return errs
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)

    const editorInfo = {
      displayName: currentUser?.displayName || currentUser?.email || 'Unknown',
      email:       currentUser?.email || '',
      uid:         currentUser?.uid || null,
    }

    const updatedData = {
      latency:                   Number(form.latency),
      accuracy:                  Number(form.accuracy),
      dataset:                   form.dataset.trim(),
      datasetType:               form.datasetType,
      hardwareInfo:              form.hardwareInfo.trim(),
      architectureUnderstanding: form.architectureUnderstanding.trim(),
      notes:                     form.notes.trim(),
      tags:                      form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }

    try {
      await updateBenchmark(modelSlug, b.id, updatedData, editorInfo, editComment.trim(), b)
      onSaved({
        ...b,
        ...updatedData,
        lastEditedBy:    editorInfo.displayName,
        lastEditedByUid: editorInfo.uid,
        editComment:     editComment.trim(),
      })
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card overflow-hidden border border-brand-600/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-600/5 border-b border-brand-600/20">
        <div className="flex items-center gap-2">
          <Pencil size={14} className="text-brand-400" />
          <span className="text-sm font-semibold text-white">Editing Run #{index + 1}</span>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 p-1">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Metrics */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Latency (ms) *</label>
            <input type="number" min="0" step="0.1" value={form.latency}
              onChange={e => set('latency', e.target.value)}
              className={`input ${errors.latency ? 'border-red-500' : ''}`} />
            {errors.latency && <p className="text-xs text-red-400 mt-1">{errors.latency}</p>}
          </div>
          <div>
            <label className="label">{isImageModel ? 'Avg Confidence / mAP (%)' : 'Accuracy / F1 Score (%)'} *</label>
            <input type="number" min="0" max="100" step="0.01" value={form.accuracy}
              onChange={e => set('accuracy', e.target.value)}
              className={`input ${errors.accuracy ? 'border-red-500' : ''}`} />
            {errors.accuracy && <p className="text-xs text-red-400 mt-1">{errors.accuracy}</p>}
          </div>
        </div>

        {/* Dataset */}
        <div>
          <label className="label">Dataset Description *</label>
          <input value={form.dataset} onChange={e => set('dataset', e.target.value)}
            className={`input ${errors.dataset ? 'border-red-500' : ''}`} />
          {errors.dataset && <p className="text-xs text-red-400 mt-1">{errors.dataset}</p>}
        </div>

        {/* Hardware */}
        <div>
          <label className="label">Hardware / Compute</label>
          <input value={form.hardwareInfo} onChange={e => set('hardwareInfo', e.target.value)}
            placeholder="e.g. NVIDIA A100 80GB" className="input" />
        </div>

        {/* Architecture understanding */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Brain size={13} className="text-brand-400" /> Architecture Understanding
          </label>
          <textarea rows={3} value={form.architectureUnderstanding}
            onChange={e => set('architectureUnderstanding', e.target.value)}
            placeholder="Describe the model architecture…"
            className="input resize-none" />
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input value={form.tags} onChange={e => set('tags', e.target.value)}
            placeholder="e.g. production, edge-device" className="input" />
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any additional context…" className="input resize-none" />
        </div>

        {/* Edit comment — required */}
        <div className="border-t border-gray-800 pt-4">
          <label className="label flex items-center gap-1.5">
            <MessageSquare size={13} className="text-orange-400" />
            Reason for Edit *
          </label>
          <textarea rows={2} value={editComment}
            onChange={e => { setEditComment(e.target.value); setErrors(v => ({ ...v, editComment: null })) }}
            placeholder="Describe why you are making this change (e.g. corrected latency measurement, updated dataset description)…"
            className={`input resize-none ${errors.editComment ? 'border-red-500' : ''}`} />
          {errors.editComment && <p className="text-xs text-red-400 mt-1">{errors.editComment}</p>}
          <p className="text-xs text-gray-600 mt-1">
            This will be recorded alongside your name ({currentUser?.displayName || currentUser?.email}) in the edit history.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 flex-1 justify-center">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
          </button>
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
            <X size={15} /> Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit history accordion ───────────────────────────────────────────────────
function EditHistorySection({ history }) {
  const [open, setOpen] = useState(false)
  const sorted = [...history].reverse() // most recent first

  return (
    <div className="border-t border-gray-800 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <History size={12} />
        Edit history ({history.length} revision{history.length !== 1 ? 's' : ''})
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {sorted.map((entry, i) => (
            <div key={i} className="bg-gray-800/60 rounded-lg px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <span className="text-gray-300 font-medium flex items-center gap-1">
                  <User size={10} /> {entry.editedBy}
                </span>
                <span className="text-gray-600">{entry.editedAt ? new Date(entry.editedAt).toLocaleString() : '—'}</span>
              </div>
              {entry.editComment && (
                <p className="text-gray-400 flex items-start gap-1.5">
                  <MessageSquare size={10} className="shrink-0 mt-0.5" />
                  "{entry.editComment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function MetricPill({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2 text-center min-w-[90px]">
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
        <Icon size={11} /> {label}
      </p>
      <p className="text-gray-200">{value}</p>
    </div>
  )
}
