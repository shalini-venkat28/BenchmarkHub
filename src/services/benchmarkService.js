/**
 * Firestore data service for benchmark entries.
 *
 * Firestore schema:
 *
 * /models/{modelId}
 *   - name: string          (canonical model name, used as display title)
 *   - slug: string          (lowercased, normalized — used as doc ID)
 *   - type: 'image' | 'text' | 'multimodal' | 'audio' | 'other'
 *   - category: string      (e.g. "Object Detection", "NLP", "Classification")
 *   - creator: string       (organisation/team)
 *   - description: string
 *   - tags: string[]
 *   - createdAt: Timestamp
 *   - updatedAt: Timestamp
 *
 * /models/{modelId}/benchmarks/{benchmarkId}
 *   - latency: number       (ms)
 *   - accuracy: number      (0-100, avg confidence / accuracy %)
 *   - dataset: string       (description of dataset used)
 *   - datasetType: 'image' | 'text' | 'mixed'
 *   - fileUrl: string | null  (Firebase Storage URL of uploaded images/zip)
 *   - fileName: string | null
 *   - fileType: string | null
 *   - hardwareInfo: string  (e.g. "NVIDIA A100 80GB")
 *   - architectureUnderstanding: string  (submitter's description of the model architecture)
 *   - notes: string
 *   - addedBy: string       (display name / email — auto-filled from auth user)
 *   - addedByUid: string    (Firebase Auth UID)
 *   - lastEditedBy: string  (display name / email of last editor)
 *   - lastEditedByUid: string
 *   - lastEditedAt: Timestamp
 *   - editComment: string   (reason for the last edit)
 *   - editHistory: Array<{editedBy, editedByUid, editedAt, editComment, snapshot}>
 *   - createdAt: Timestamp
 *   - tags: string[]        (use-case tags for this run)
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { db, storage } from '../firebase'

// ─── Slug helper ──────────────────────────────────────────────────────────────
export function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Models ───────────────────────────────────────────────────────────────────
export async function getAllModels() {
  const snap = await getDocs(
    query(collection(db, 'models'), orderBy('updatedAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getModelBySlug(slug) {
  const snap = await getDoc(doc(db, 'models', slug))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function getModelsByType(type) {
  const snap = await getDocs(
    query(
      collection(db, 'models'),
      where('type', '==', type),
      orderBy('updatedAt', 'desc')
    )
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createModel(data) {
  const slug = toSlug(data.name)
  await setDoc(doc(db, 'models', slug), {
    ...data,
    slug,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return slug
}

export async function updateModelMeta(slug, data) {
  await updateDoc(doc(db, 'models', slug), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// ─── Benchmarks (sub-collection) ─────────────────────────────────────────────
export async function getBenchmarks(modelSlug) {
  const snap = await getDocs(
    query(
      collection(db, 'models', modelSlug, 'benchmarks'),
      orderBy('createdAt', 'desc')
    )
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addBenchmark(modelSlug, data) {
  const ref_ = collection(db, 'models', modelSlug, 'benchmarks')
  const docRef = await addDoc(ref_, {
    ...data,
    createdAt: serverTimestamp(),
  })
  // Update parent model's updatedAt
  await updateDoc(doc(db, 'models', modelSlug), {
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

// ─── Update an existing benchmark run ────────────────────────────────────────
/**
 * Updates a benchmark run and appends an edit history entry.
 * @param {string} modelSlug
 * @param {string} benchmarkId
 * @param {object} updatedData   - the new field values
 * @param {object} editorInfo    - { displayName, uid }
 * @param {string} editComment   - reason for the edit
 * @param {object} previousData  - snapshot of the data before editing (for history)
 */
export async function updateBenchmark(modelSlug, benchmarkId, updatedData, editorInfo, editComment, previousData) {
  const benchRef = doc(db, 'models', modelSlug, 'benchmarks', benchmarkId)

  // Build a clean snapshot of what changed (exclude system fields)
  const snapshot = {}
  const trackFields = ['latency', 'accuracy', 'dataset', 'datasetType', 'hardwareInfo',
    'architectureUnderstanding', 'notes', 'addedBy', 'tags']
  for (const f of trackFields) {
    if (previousData[f] !== undefined) snapshot[f] = previousData[f]
  }

  const historyEntry = {
    editedBy:    editorInfo.displayName || editorInfo.email || 'Unknown',
    editedByUid: editorInfo.uid || null,
    editedAt:    new Date().toISOString(),
    editComment: editComment || '',
    snapshot,
  }

  await updateDoc(benchRef, {
    ...updatedData,
    lastEditedBy:    editorInfo.displayName || editorInfo.email || 'Unknown',
    lastEditedByUid: editorInfo.uid || null,
    lastEditedAt:    serverTimestamp(),
    editComment,
    // Append to editHistory array using arrayUnion isn't ideal for objects, so we pass full array
    editHistory: [...(previousData.editHistory || []), historyEntry],
  })

  await updateDoc(doc(db, 'models', modelSlug), { updatedAt: serverTimestamp() })
}

// ─── File upload to Firebase Storage ─────────────────────────────────────────
/**
 * @param {File} file
 * @param {string} modelSlug
 * @param {function} onProgress  (percent: number) => void
 * @returns {Promise<{url: string, name: string, type: string}>}
 */
export function uploadDatasetFile(file, modelSlug, onProgress) {
  return new Promise((resolve, reject) => {
    const path = `datasets/${modelSlug}/${Date.now()}_${file.name}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      snapshot => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        )
        onProgress?.(pct)
      },
      err => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, name: file.name, type: file.type })
      }
    )
  })
}

// ─── Real-time listener with latest benchmark data ───────────────────────────
export function subscribeToModels(callback) {
  return onSnapshot(
    query(collection(db, 'models'), orderBy('updatedAt', 'desc')),
    async snap => {
      const models = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      
      // Fetch latest benchmark for each model to get _latestAccuracy and _latestLatency
      await Promise.all(
        models.map(async m => {
          try {
            const benchmarks = await getDocs(
              query(
                collection(db, 'models', m.id, 'benchmarks'),
                orderBy('createdAt', 'desc'),
                limit(1)
              )
            )
            if (!benchmarks.empty) {
              const latest = benchmarks.docs[0].data()
              m._latestAccuracy = latest.accuracy ?? null
              m._latestLatency = latest.latency ?? null
            }
          } catch {}
        })
      )
      
      callback(models)
    }
  )
}

// ─── Export all data to array for Excel download ──────────────────────────────
/**
 * Fetches all models + their benchmarks and returns a flat array of rows
 * suitable for Excel export.
 */
export async function getAllDataForExport() {
  const models = await getAllModels()
  const rows = []
  await Promise.all(
    models.map(async m => {
      const benchmarks = await getBenchmarks(m.id)
      if (benchmarks.length === 0) {
        // Include the model with empty benchmark fields
        rows.push({ model: m, benchmark: null })
      } else {
        for (const b of benchmarks) {
          rows.push({ model: m, benchmark: b })
        }
      }
    })
  )
  return rows
}
