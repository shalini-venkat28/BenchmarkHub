import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart2, TrendingUp, Zap, Target,
  Image, FileText, Layers, Volume2, Grid, ArrowRight, FlaskConical,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'

const TYPE_META = {
  image:      { label: 'Image Models',      icon: Image,        color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  text:       { label: 'Text / NLP',        icon: FileText,     color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'       },
  multimodal: { label: 'Multimodal',        icon: Layers,       color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'},
  audio:      { label: 'Audio Models',      icon: Volume2,      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  finetuned:  { label: 'Fine-tuned Models', icon: FlaskConical, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  other:      { label: 'Other',             icon: Grid,         color: 'bg-gray-500/10 text-gray-400 border-gray-500/20'       },
}

const CHART_COLORS = ['#7485ff', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f97316']

export default function HomePage({ models }) {
  const stats = useMemo(() => {
    const types = [...new Set(models.map(m => (m.type || 'other').toLowerCase()))]
    return {
      total: models.length,
      categories: types.length,
      recent: models.slice(0, 5),
    }
  }, [models])

  const typeData = useMemo(() =>
    Object.entries(TYPE_META)
      .map(([type, meta]) => ({
        type,
        label: meta.label,
        count: models.filter(m => (m.type || 'other').toLowerCase() === type).length,
      }))
      .filter(d => d.count > 0),
    [models]
  )

  const grouped = useMemo(() => {
    const map = {}
    for (const m of models) {
      const t = (m.type || 'other').toLowerCase()
      if (!map[t]) map[t] = []
      map[t].push(m)
    }
    return map
  }, [models])

  if (models.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Model Benchmark <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Track, compare and explore AI model performance across categories.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BarChart2} label="Total Models" value={stats.total} color="text-brand-400" />
        <StatCard icon={Grid}      label="Categories"   value={stats.categories} color="text-purple-400" />
        <StatCard
          icon={Zap}
          label="Avg Latency"
          value={avgLatency(models)}
          suffix="ms"
          color="text-yellow-400"
        />
        <StatCard
          icon={Target}
          label="Avg Accuracy"
          value={avgAccuracy(models)}
          suffix="%"
          color="text-emerald-400"
        />
      </div>

      {/* Chart + recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="section-title mb-4">Models by Type</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                    fontSize: '13px',
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" fill="#4f5eff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm">No data yet.</p>
          )}
        </div>

        {/* Recent models */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recently Added</h2>
            <Link to="/leaderboard" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recent.map(m => {
              const meta = TYPE_META[(m.type || 'other').toLowerCase()] || TYPE_META.other
              const Icon = meta.icon
              return (
                <Link
                  key={m.id}
                  to={`/model/${m.slug}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${meta.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.category || m.type}</p>
                  </div>
                  <ArrowRight size={13} className="text-gray-600 shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Category sections */}
      {Object.entries(grouped).map(([type, items]) => {
        const meta = TYPE_META[type] || TYPE_META.other
        const Icon = meta.icon
        return (
          <section key={type}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${meta.color}`}>
                <Icon size={16} />
              </div>
              <h2 className="section-title">{meta.label}</h2>
              <span className="badge bg-gray-800 text-gray-400">{items.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map(m => (
                <ModelCard key={m.id} model={m} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, suffix = '', color }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold font-mono ${color}`}>
            {value}{suffix && <span className="text-lg ml-0.5">{suffix}</span>}
          </p>
        </div>
        <Icon size={18} className={`${color} opacity-70 mt-0.5`} />
      </div>
    </div>
  )
}

function ModelCard({ model }) {
  const meta = TYPE_META[(model.type || 'other').toLowerCase()] || TYPE_META.other
  const Icon = meta.icon

  return (
    <Link to={`/model/${model.slug}`} className="card-hover p-4 block">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.color}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{model.name}</p>
          <p className="text-xs text-gray-500 truncate">{model.creator || '—'}</p>
        </div>
      </div>
      {model.description && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{model.description}</p>
      )}
      <div className="flex gap-2 mt-3">
        {(model.tags || []).slice(0, 3).map(tag => (
          <span key={tag} className="badge bg-gray-800 text-gray-400 border border-gray-700">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-brand-400 font-medium">
        View benchmarks <ArrowRight size={12} />
      </div>
    </Link>
  )
}

function avgLatency(models) {
  const vals = models.map(m => m._latestLatency).filter(Boolean)
  if (!vals.length) return '—'
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function avgAccuracy(models) {
  const vals = models.map(m => m._latestAccuracy).filter(Boolean)
  if (!vals.length) return '—'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-16 h-16 bg-brand-600/10 rounded-2xl flex items-center justify-center mb-5">
        <BarChart2 size={32} className="text-brand-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">No benchmarks yet</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        Start tracking AI model performance by adding your first benchmark entry.
      </p>
      <Link to="/add" className="btn-primary text-sm">
        + Add First Benchmark
      </Link>
    </div>
  )
}
