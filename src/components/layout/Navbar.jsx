import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart2, Plus, MessageSquare, Menu, Trophy,
  X, FileSpreadsheet, Download, LogOut, ChevronDown, User,
} from 'lucide-react'
import { logOut } from '../../services/authService'
import { getAllDataForExport } from '../../services/benchmarkService'
import { downloadTemplate, TEMPLATE_COLUMNS } from '../../pages/BulkImportPage'
import * as XLSX from 'xlsx'

async function exportAllData() {
  const rows = await getAllDataForExport()
  if (!rows.length) { alert('No data to export yet.'); return }

  const headers = TEMPLATE_COLUMNS.map(c => c.label)
  const dataRows = rows.map(({ model, benchmark: b }) => {
    const get = (key, src) => src?.[key] ?? ''
    return [
      get('name', model),
      get('type', model),
      get('category', model),
      get('creator', model),
      get('description', model),
      (model.tags || []).join(', '),
      b?.latency ?? '',
      b?.accuracy ?? '',
      b?.dataset ?? '',
      b?.datasetType ?? '',
      b?.hardwareInfo ?? '',
      b?.architectureUnderstanding ?? '',
      b?.addedBy ?? '',
      (b?.tags || []).join(', '),
      b?.notes ?? '',
    ]
  })

  const wsData = [headers, ...dataRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = TEMPLATE_COLUMNS.map(c => ({ wch: Math.max(c.label.length + 4, 20) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'All Benchmarks')
  XLSX.writeFile(wb, `benchmark_hub_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export default function Navbar({ user, onMenuToggle, onChatToggle, chatOpen }) {
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const navLinks = [
    { to: '/',            label: 'Dashboard',      icon: BarChart2 },
    { to: '/leaderboard', label: 'Leaderboard',    icon: Trophy    },
    { to: '/add',         label: 'Add Benchmark',  icon: Plus      },
    { to: '/bulk-import', label: 'Bulk Import',    icon: FileSpreadsheet },
  ]

  async function handleExport() {
    setExporting(true)
    try { await exportAllData() }
    catch (e) { alert('Export failed: ' + e.message) }
    finally { setExporting(false) }
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''

  return (
    <header className="sticky top-0 z-40 bg-white/[0.03] backdrop-blur-2xl border-b border-white/[0.08] relative">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="btn-ghost p-2 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white hidden sm:block">
            Benchmark <span className="gradient-text">Hub</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary text-sm hidden sm:flex items-center gap-2"
          title="Export all data to Excel"
        >
          <Download size={14} />
          <span className="hidden md:inline">{exporting ? 'Exporting…' : 'Export'}</span>
        </button>

        {/* Chat toggle */}
        <button
          onClick={onChatToggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            chatOpen
              ? 'bg-brand-600/20 text-brand-400 border border-brand-600/40'
              : 'btn-secondary'
          }`}
          aria-label="Toggle AI assistant"
        >
          {chatOpen ? <X size={15} /> : <MessageSquare size={15} />}
          <span className="hidden sm:inline">
            {chatOpen ? 'Close' : 'AI Assistant'}
          </span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-all duration-200"
            aria-label="User menu"
          >
            <div className="w-6 h-6 bg-brand-600/30 rounded-full flex items-center justify-center">
              <User size={12} className="text-brand-400" />
            </div>
            <span className="hidden md:inline max-w-[120px] truncate">{displayName}</span>
            <ChevronDown size={13} />
          </button>

          {userMenuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 glass-strong z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.08]">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-colors"
                >
                  <Download size={14} />
                  {exporting ? 'Exporting…' : 'Export All Data'}
                </button>
                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-colors"
                >
                  <FileSpreadsheet size={14} />
                  Download Template
                </button>
                <div className="border-t border-white/[0.08]" />
                <button
                  onClick={() => { setUserMenuOpen(false); logOut() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/[0.06] transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
