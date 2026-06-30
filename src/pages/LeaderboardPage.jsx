import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, ArrowUp, ArrowDown, Filter, Search, ArrowRight } from 'lucide-react'
import { getBenchmarks } from '../services/benchmarkService'

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
  const [filterType, setFilterType] = useState('all')
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
              map[m.id] = benchmarks[0] // most recent first
            }
          } catch {}
        })
      )
      if (alive) { setBenchmarkMap(map); setLoading(false) }
    }
    load()
    return () => { alive = false }
  }, [models])

  const rows = useMemo(() => {
    let list = models
      .filter(m => filterType === 'all' || (m.type || 'other').toLowerCase() === filterType)
      .filter(m =>
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.creator || '').toLowerCase().includes(search.toLowerCase())
      )
      .map(m => ({
        ...m,
        latestBenchmark: benchmarkMap[m.id] || null,
        latency: benchmarkMap[m.id]?.latency ?? null,
        accuracy: benchmarkMap[m.id]?.accuracy ?? null,
      }))

    const [field, dir] = sort.split('-')
    list.sort((a, b) => {
      let av = field === 'name' ? a.name : a[field]
      let bv = field === 'name' ? b.name : b[field]
      if (av === null) return 1
      if (bv === null) return -1
      if (field === 'name') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return dir === 'asc' ? av - bv : bv - av
    })

    return list
  }, [models, benchmarkMap, sort, filterType, search])

  const types = useMemo(() => [...new Set(models.map(m => (m.type || 'other').toLowerCase()))], [models])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy size={28} className="text-yellow-400" />
            Leaderboard
          </h1>
          <p className="text-gray-400 mt-1">All models ranked by performance</p>
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

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="input text-sm w-auto pr-8"
          >
            <option value="all">All types</option>
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
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

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading benchmarks…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No models match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Accuracy</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Latency</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dataset</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map((row, i) => (
                  <LeaderboardRow key={row.id} row={row} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderboardRow({ row, rank }) {
  const typeColor = TYPE_COLORS[row.type] || TYPE_COLORS.other

  const medalColor =
    rank === 1 ? 'text-yellow-400' :
    rank === 2 ? 'text-gray-300' :
    rank === 3 ? 'text-amber-600' :
    'text-gray-600'

  return (
    <tr className="hover:bg-gray-800/40 transition-colors">
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
        <span className={`badge border ${typeColor}`}>{row.type}</span>
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
