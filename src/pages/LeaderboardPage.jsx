import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Filter, Search, ArrowRight, Layers } from 'lucide-react'
import { getBenchmarks } from '../services/benchmarkService'
import { normalizeCategory } from '../utils/categories'

const SORT_OPTIONS = [
  { value: 'accuracy-desc',  label: 'Best Accuracy'    },
  { value: 'accuracy-asc',   label: 'Worst Accuracy'   },
  { value: 'latency-asc',    label: 'Fastest (Latency)'},
  { value: 'latency-desc',   label: 'Slowest (Latency)'},
  { value: 'name-asc',       label: 'Name A→Z'         },
]

const TYPE_COLORS = {
  image:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  text:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  multimodal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  audio:      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  finetuned:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  other:      'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export default function LeaderboardPage({ models }) {
  const [sort, setSort] = useState('accuracy-desc')
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [benchmarkMap, setBenchmarkMap] = useState({})
  const [loading, setLoading] = useState(true)

  // Fetch latest benchmark for each model
  useEffect(() => {
    if (!models.length) { setLoading(false); return }
    let alive = true
    async function load() {
      const map = {}
      await Promise.all(
        models.map(async m => {
          try {
            const benchmarks = await getBenchmarks(m.id)
            if (benchmarks.length > 0) {
              map[m.id] = benchmarks[0]
            }
          } catch {}
        })
      )
      if (alive) { setBenchmarkMap(map); setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [models])

  // Get all categories from models (normalized)
  const categories = useMemo(() => {
    const cats = new Set()
    models.forEach(m => cats.add(normalizeCategory(m.category)))
    return [...cats].sort((a, b) => {
      if (a === 'Uncategorized') return 1
      if (b === 'Uncategorized') return -1
      return a.localeCompare(b)
    })
  }, [models])

  // Build enriched model rows
  const allRows = useMemo(() => {
    return models.map(m => ({
      ...m,
      latestBenchmark: benchmarkMap[m.id] || null,
      latency: benchmarkMap[m.id]?.latency ?? null,
      accuracy: benchmarkMap[m.id]?.accuracy ?? null,
      normalizedCategory: normalizeCategory(m.category),
    }))
  }, [models, benchmarkMap])

  // Filter and group by category
  const groupedByCategory = useMemo(() => {
    let filtered = allRows
      .filter(m => filterCategory === 'all' || m.normalizedCategory === filterCategory)
      .filter(m =>
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.creator || '').toLowerCase().includes(search.toLowerCase())
      )

    // Group by category
    const groups = {}
    for (const row of filtered) {
      const cat = row.normalizedCategory
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(row)
    }

    // Sort within each group
    const [field, dir] = sort.split('-')
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        let av = field === 'name' ? a.name : a[field]
        let bv = field === 'name' ? b.name : b[field]
        if (av === null) return 1
        if (bv === null) return -1
        if (field === 'name') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return dir === 'asc' ? av - bv : bv - av
      })
    }

    return groups
  }, [allRows, sort, filterCategory, search])

  const sortedCategoryNames = useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => {
      if (a === 'Uncategorized') return 1
      if (b === 'Uncategorized') return -1
      return a.localeCompare(b)
    })
  }, [groupedByCategory])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy size={28} className="text-yellow-400" />
            Leaderboard
          </h1>
          <p className="text-gray-400 mt-1">Models ranked by performance within each category</p>
        </div>
        <Link to="/add" className="btn-primary text-sm">
          + Add Benchmark
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models…"
            className="input pl-9 text-sm"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="input text-sm w-auto pr-8"
          >
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="input text-sm w-auto pr-8"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Category-grouped tables */}
      {loading ? (
        <div className="card p-12 text-center text-gray-500">Loading benchmarks…</div>
      ) : sortedCategoryNames.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No models match your filters.</div>
      ) : (
        <div className="space-y-6">
          {sortedCategoryNames.map(category => {
            const rows = groupedByCategory[category]
            return (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-3">
                  <Layers size={18} className="text-brand-400" />
                  <h2 className="text-lg font-semibold text-white">{category}</h2>
                  <span className="text-xs text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded-md">
                    {rows.length} model{rows.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Table */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Rank</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Model</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Accuracy</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Latency</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dataset</th>
                          <th className="px-4 py-3 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {rows.map((row, i) => (
                          <LeaderboardRow key={row.id} row={row} rank={i + 1} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LeaderboardRow({ row, rank }) {
  const typeColor = TYPE_COLORS[(row.type || 'other').toLowerCase()] || TYPE_COLORS.other

  const medalColor =
    rank === 1 ? 'text-yellow-400' :
    rank === 2 ? 'text-gray-300' :
    rank === 3 ? 'text-amber-600' :
    'text-gray-600'

  return (
    <tr className="hover:bg-white/[0.03] transition-colors">
      <td className={`px-4 py-3 font-bold font-mono text-sm ${medalColor}`}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white">{row.name}</p>
          {row.creator && (
            <p className="text-xs text-gray-500">{row.creator}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`badge border ${typeColor}`}>{row.type || 'other'}</span>
      </td>
      <td className="px-4 py-3 text-right">
        {row.accuracy !== null ? (
          <span className="font-mono font-semibold text-emerald-400">
            {row.accuracy.toFixed(1)}%
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {row.latency !== null ? (
          <span className="font-mono font-semibold text-yellow-400">
            {row.latency}ms
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">
        {row.latestBenchmark?.dataset || '—'}
      </td>
      <td className="px-4 py-3">
        <Link
          to={`/model/${row.slug}`}
          className="text-brand-400 hover:text-brand-300 p-1"
          aria-label={`View ${row.name}`}
        >
          <ArrowRight size={14} />
        </Link>
      </td>
    </tr>
  )
}
