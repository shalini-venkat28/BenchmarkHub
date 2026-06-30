import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  Download, Upload, CheckCircle2, XCircle, Loader2,
  AlertTriangle, FileSpreadsheet, ArrowLeft, Info,
} from 'lucide-react'
import { createModel, addBenchmark, toSlug, getModelBySlug } from '../services/benchmarkService'

// ─── Template column definitions ─────────────────────────────────────────────
export const TEMPLATE_COLUMNS = [
  // Model fields
  { key: 'modelName',               label: 'Model Name',                    required: true,  example: 'YOLOv8n' },
  { key: 'modelType',               label: 'Model Type',                    required: true,  example: 'image',  note: 'image | text | multimodal | audio | other' },
  { key: 'modelCategory',           label: 'Model Category',                required: false, example: 'Object Detection' },
  { key: 'modelCreator',            label: 'Model Creator / Org',           required: false, example: 'Ultralytics' },
  { key: 'modelDescription',        label: 'Model Description',             required: false, example: 'Nano variant of YOLOv8 for edge deployment' },
  { key: 'modelTags',               label: 'Model Tags (comma-separated)',   required: false, example: 'realtime, edge, object-detection' },
  // Benchmark fields
  { key: 'latency',                 label: 'Latency (ms)',                  required: true,  example: '4.2' },
  { key: 'accuracy',                label: 'Accuracy / mAP / F1 (%)',       required: true,  example: '37.3' },
  { key: 'dataset',                 label: 'Dataset Description',           required: true,  example: 'COCO val2017, 5000 images' },
  { key: 'datasetType',             label: 'Dataset Type',                  required: false, example: 'image-dataset', note: 'image-dataset | zip-of-images | text-corpus | json-dataset | csv-dataset | benchmark-suite | custom' },
  { key: 'hardwareInfo',            label: 'Hardware / Compute',            required: false, example: 'NVIDIA A100 80GB' },
  { key: 'architectureUnderstanding', label: 'Architecture Understanding', required: false, example: 'Single-stage anchor-free detector. Backbone uses CSPDarknet with C2f modules. Head decoupled into cls/reg branches. Trained on COCO with mosaic augmentation.' },
  { key: 'addedBy',                 label: 'Added By',                      required: false, example: 'alice@zeb.co' },
  { key: 'tags',                    label: 'Run Tags (comma-separated)',     required: false, example: 'production, q4-eval' },
  { key: 'notes',                   label: 'Notes',                         required: false, example: 'Batch size 32, FP16 precision, TensorRT optimized' },
]

// Example rows — two entries for YOLOv8n, one for GPT-4
const EXAMPLE_ROWS = [
  {
    modelName: 'YOLOv8n',
    modelType: 'image',
    modelCategory: 'Object Detection',
    modelCreator: 'Ultralytics',
    modelDescription: 'Nano variant of YOLOv8 for edge deployment',
    modelTags: 'realtime, edge, object-detection',
    latency: 4.2,
    accuracy: 37.3,
    dataset: 'COCO val2017, 5000 images',
    datasetType: 'image-dataset',
    hardwareInfo: 'NVIDIA A100 80GB',
    architectureUnderstanding: 'Single-stage anchor-free detector. Backbone uses CSPDarknet with C2f modules. Head decoupled into cls/reg branches. Trained on COCO with mosaic augmentation.',
    addedBy: 'alice@zeb.co',
    tags: 'production, baseline',
    notes: 'FP16, TensorRT 8.6',
  },
  {
    modelName: 'YOLOv8n',
    modelType: 'image',
    modelCategory: 'Object Detection',
    modelCreator: 'Ultralytics',
    modelDescription: 'Nano variant of YOLOv8 for edge deployment',
    modelTags: 'realtime, edge, object-detection',
    latency: 5.1,
    accuracy: 36.8,
    dataset: 'Custom 2000-image street scene dataset',
    datasetType: 'zip-of-images',
    hardwareInfo: 'Apple M2 Pro (CPU only)',
    architectureUnderstanding: 'Ran the same backbone but in CPU mode. Latency increases significantly. No TensorRT on macOS.',
    addedBy: 'bob@zeb.co',
    tags: 'edge-test, cpu',
    notes: 'PyTorch native, no optimization',
  },
  {
    modelName: 'GPT-4o',
    modelType: 'text',
    modelCategory: 'Text Generation',
    modelCreator: 'OpenAI',
    modelDescription: 'Multimodal GPT-4 variant optimized for speed',
    modelTags: 'llm, gpt, generation',
    latency: 1200,
    accuracy: 91.4,
    dataset: 'Custom 500-question internal QA suite',
    datasetType: 'json-dataset',
    hardwareInfo: 'OpenAI API (unknown)',
    architectureUnderstanding: 'Transformer decoder with ~1.8T parameters (estimated). Uses MoE architecture. Context window 128k tokens. Fine-tuned with RLHF. Outputs structured JSON reliably.',
    addedBy: 'carol@zeb.co',
    tags: 'api, gpt4, production',
    notes: 'Temperature 0.2, top_p 0.9. Measured end-to-end API latency.',
  },
  {
    modelName: 'Whisper Large v3',
    modelType: 'audio',
    modelCategory: 'Speech Recognition',
    modelCreator: 'OpenAI',
    modelDescription: 'State-of-the-art multilingual speech recognition model',
    modelTags: 'asr, speech, multilingual',
    latency: 2800,
    accuracy: 94.2,
    dataset: 'LibriSpeech test-clean, 2620 utterances',
    datasetType: 'benchmark-suite',
    hardwareInfo: 'NVIDIA V100 32GB',
    architectureUnderstanding: 'Encoder-decoder Transformer. Encoder processes log-Mel spectrogram. Trained on 680k hours of multilingual audio. Uses multitask training (transcription + translation). WER metric used as inverse of accuracy.',
    addedBy: 'alice@zeb.co',
    tags: 'speech, v100, benchmark',
    notes: 'WER converted to accuracy as (100 - WER%). beam_size=5',
  },
]

// ─── Download template ────────────────────────────────────────────────────────
export function downloadTemplate() {
  const headers = TEMPLATE_COLUMNS.map(c => c.label)
  const notes   = TEMPLATE_COLUMNS.map(c =>
    (c.required ? '* REQUIRED' : 'optional') + (c.note ? ' | ' + c.note : '')
  )
  const examples = EXAMPLE_ROWS.map(row =>
    TEMPLATE_COLUMNS.map(c => row[c.key] ?? '')
  )

  const wsData = [headers, notes, ...examples]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Column widths
  ws['!cols'] = TEMPLATE_COLUMNS.map(c => ({
    wch: Math.max(c.label.length + 4, (c.example || '').length + 4, 20),
  }))

  // Style header row (row 0) — bold + background via !rows hack
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[addr]) continue
    ws[addr].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: '1E293B' } },
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Benchmarks')

  // Instructions sheet
  const instrData = [
    ['BENCHMARK HUB — IMPORT TEMPLATE INSTRUCTIONS'],
    [''],
    ['HOW TO USE THIS FILE'],
    ['1. Row 1 is the header (do not edit the header row).'],
    ['2. Row 2 shows whether each column is required or optional and allowed values.'],
    ['3. Rows 3+ are example entries — REPLACE them with your actual data.'],
    ['4. You can have MULTIPLE rows for the same model — each row becomes one benchmark run.'],
    ['5. Save the file as .xlsx and upload it on the Bulk Import page.'],
    [''],
    ['COLUMN GUIDE'],
    ...TEMPLATE_COLUMNS.map(c => [
      c.label,
      c.required ? 'REQUIRED' : 'optional',
      c.note || '',
      'e.g. ' + (c.example || ''),
    ]),
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData)
  wsInstr['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 55 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions')

  XLSX.writeFile(wb, 'benchmark_hub_template.xlsx')
}

// ─── Parse uploaded Excel ─────────────────────────────────────────────────────
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (rows.length < 3) {
          return reject(new Error('File must have a header row and at least one data row.'))
        }

        const headerRow = rows[0].map(h => String(h).trim())

        // Map header labels → column keys
        const colMap = {}
        TEMPLATE_COLUMNS.forEach(col => {
          const idx = headerRow.findIndex(h =>
            h.toLowerCase() === col.label.toLowerCase()
          )
          if (idx >= 0) colMap[col.key] = idx
        })

        const missing = TEMPLATE_COLUMNS
          .filter(c => c.required && colMap[c.key] === undefined)
          .map(c => c.label)
        if (missing.length) {
          return reject(new Error(`Missing required columns: ${missing.join(', ')}`))
        }

        // Parse data rows — skip row index 1 (it's the notes/hints row from template)
        // Detect if row[1] is notes row (contains "REQUIRED" or "optional")
        const startRow = rows[1] &&
          String(rows[1][0] || '').toLowerCase().includes('required') ||
          String(rows[1][0] || '').toLowerCase().includes('optional')
          ? 2 : 1

        const parsed = []
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i]
          const get = key => {
            const idx = colMap[key]
            return idx !== undefined ? String(row[idx] ?? '').trim() : ''
          }
          const modelName = get('modelName')
          if (!modelName) continue // skip blank rows

          parsed.push({
            rowNum: i + 1,
            model: {
              name:        modelName,
              type:        get('modelType') || 'other',
              category:    get('modelCategory'),
              creator:     get('modelCreator'),
              description: get('modelDescription'),
              tags:        get('modelTags').split(',').map(t => t.trim()).filter(Boolean),
            },
            benchmark: {
              latency:                  parseFloat(get('latency')) || 0,
              accuracy:                 parseFloat(get('accuracy')) || 0,
              dataset:                  get('dataset'),
              datasetType:              get('datasetType'),
              hardwareInfo:             get('hardwareInfo'),
              architectureUnderstanding: get('architectureUnderstanding'),
              addedBy:                  get('addedBy'),
              tags:                     get('tags').split(',').map(t => t.trim()).filter(Boolean),
              notes:                    get('notes'),
              fileUrl: null, fileName: null, fileType: null,
            },
          })
        }

        resolve(parsed)
      } catch (err) {
        reject(new Error('Could not parse file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BulkImportPage({ models }) {
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState([])      // parsed rows
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults]     = useState([])      // [{rowNum, modelName, status, error}]
  const [done, setDone]           = useState(false)
  const fileRef = useRef(null)

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setParseError('')
    setPreview([])
    setResults([])
    setDone(false)
    try {
      const rows = await parseExcel(f)
      setPreview(rows)
    } catch (err) {
      setParseError(err.message)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (f) handleFile(f)
  }

  async function handleImport() {
    if (!preview.length) return
    setImporting(true)
    setDone(false)

    // Build a local slug→model cache (start from existing models)
    const slugCache = {}
    for (const m of models) slugCache[toSlug(m.name)] = m

    const res = []
    for (const row of preview) {
      const slug = toSlug(row.model.name)
      try {
        // Upsert model
        if (!slugCache[slug]) {
          // Check Firestore in case it was created in a prior iteration
          const existing = await getModelBySlug(slug)
          if (existing) {
            slugCache[slug] = existing
          } else {
            await createModel(row.model)
            slugCache[slug] = { ...row.model, id: slug, slug }
          }
        }

        await addBenchmark(slug, row.benchmark)
        res.push({ rowNum: row.rowNum, modelName: row.model.name, status: 'ok' })
      } catch (err) {
        res.push({ rowNum: row.rowNum, modelName: row.model.name, status: 'error', error: err.message })
      }
    }

    setResults(res)
    setImporting(false)
    setDone(true)
  }

  const ok    = results.filter(r => r.status === 'ok').length
  const errors = results.filter(r => r.status === 'error')

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/add" className="btn-ghost text-sm flex items-center gap-2">
          <ArrowLeft size={15} /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSpreadsheet size={24} className="text-emerald-400" />
            Bulk Import
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Upload an Excel file to add many benchmark entries at once.
          </p>
        </div>
      </div>

      {/* Download template */}
      <div className="card p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
          <Download size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white mb-1">Step 1 — Download the Template</h2>
          <p className="text-sm text-gray-400 mb-3">
            The template includes all required and optional columns, a notes row explaining each field,
            and 4 example entries (two runs for YOLOv8n, one for GPT-4o, one for Whisper Large v3)
            so you can see exactly how multi-run models work.
          </p>
          <button
            onClick={downloadTemplate}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Download size={15} /> Download benchmark_hub_template.xlsx
          </button>
        </div>
      </div>

      {/* Upload */}
      <div className="card p-5">
        <h2 className="font-semibold text-white mb-4">Step 2 — Upload Your Filled File</h2>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file && !parseError
              ? 'border-emerald-500/40 bg-emerald-600/5'
              : parseError
              ? 'border-red-500/40 bg-red-600/5'
              : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet size={20} className={parseError ? 'text-red-400' : 'text-emerald-400'} />
              <div className="text-left">
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload size={28} className="mx-auto mb-2 text-gray-600" />
              <p className="text-sm">Drag &amp; drop or click to upload</p>
              <p className="text-xs mt-1 text-gray-600">.xlsx or .xls</p>
            </div>
          )}
        </div>

        {parseError && (
          <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{parseError}</p>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && !done && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">
              Preview — {preview.length} row{preview.length !== 1 ? 's' : ''} detected
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info size={12} />
              Review before importing
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">#</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Model</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Type</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Accuracy</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Latency</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Dataset</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Added By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {preview.map(row => (
                  <tr key={row.rowNum} className="hover:bg-gray-800/40">
                    <td className="px-3 py-2 text-gray-600 font-mono">{row.rowNum}</td>
                    <td className="px-3 py-2 text-white font-medium max-w-[160px] truncate">{row.model.name}</td>
                    <td className="px-3 py-2">
                      <span className="badge bg-gray-800 text-gray-400 border border-gray-700">{row.model.type}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-400 font-mono">{row.benchmark.accuracy}%</td>
                    <td className="px-3 py-2 text-right text-yellow-400 font-mono">{row.benchmark.latency}ms</td>
                    <td className="px-3 py-2 text-gray-400 max-w-[200px] truncate">{row.benchmark.dataset}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{row.benchmark.addedBy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-gray-800">
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary flex items-center gap-2"
            >
              {importing ? (
                <><Loader2 size={16} className="animate-spin" /> Importing…</>
              ) : (
                <><Upload size={16} /> Import {preview.length} Entries</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {done && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <h2 className="font-semibold text-white">Import Complete</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400 font-mono">{ok}</p>
              <p className="text-xs text-gray-400 mt-0.5">Entries imported</p>
            </div>
            <div className={`rounded-lg p-3 text-center border ${errors.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-800 border-gray-700'}`}>
              <p className={`text-2xl font-bold font-mono ${errors.length > 0 ? 'text-red-400' : 'text-gray-500'}`}>{errors.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Errors</p>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">Failed rows:</p>
              {errors.map(r => (
                <div key={r.rowNum} className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">
                    Row {r.rowNum} · <strong>{r.modelName}</strong>: {r.error}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link to="/" className="btn-primary text-sm">Back to Dashboard</Link>
            <button
              onClick={() => { setFile(null); setPreview([]); setResults([]); setDone(false) }}
              className="btn-secondary text-sm"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
