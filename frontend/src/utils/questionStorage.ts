import { normalizeBank, normalizeQuestion, migrateSelection } from '@exameow/shared'

const keys = ['exameow-banks', 'exameow-practice-session', 'exameow-questions', 'exameow-joined']
const cache = new Map<string, string>()
let db: IDBDatabase
let pending: Promise<void> = Promise.resolve()

function write(key: string, value: string | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('json', 'readwrite')
    if (value === null) tx.objectStore('json').delete(key)
    else tx.objectStore('json').put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Unable to save question data'))
  })
}

export async function initializeQuestionStorage() {
  db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('exameow-question-data', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('json')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  for (const key of keys) {
    const stored = await new Promise<string | undefined>((resolve, reject) => {
      const request = db.transaction('json').objectStore('json').get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const raw = stored ?? localStorage.getItem(key)
    if (!raw) continue
    let data = JSON.parse(raw)
    const migrateItem = (item: any) => {
      const legacy = !item.question.questionHeader
      const question = normalizeQuestion(item.question)
      return { ...item, question, userAnswer: legacy ? migrateSelection(question, item.userAnswer) : item.userAnswer }
    }
    if (key === 'exameow-banks') data = data.map(normalizeBank)
    if (key === 'exameow-questions') data = data.map(normalizeQuestion)
    if (key === 'exameow-practice-session' && data) {
      data.questions = data.questions.map(migrateItem)
      if (data.mockConfig?.typeCounts?.multi_choice !== undefined) {
        data.mockConfig.typeCounts.multiple_choice = data.mockConfig.typeCounts.multi_choice
        delete data.mockConfig.typeCounts.multi_choice
      }
      if (data.filter?.types) data.filter.types = data.filter.types.map((t: string) => t === 'multi_choice' ? 'multiple_choice' : t)
    }
    if (key === 'exameow-joined') data = data.map((entry: any) => ({ ...entry, graded: entry.graded?.map(migrateItem) }))
    const canonical = JSON.stringify(data)
    await write(key, canonical)
    cache.set(key, canonical)
    // Keep the original localStorage data as a rollback copy. Only remove it on explicit deletion.
  }
}

export const questionStorage = {
  getItem(key: string): string | null { return cache.get(key) ?? null },
  setItem(key: string, value: string) {
    cache.set(key, value)
    pending = pending.catch(() => {}).then(() => write(key, value))
    pending.catch(error => window.dispatchEvent(new CustomEvent('question-storage-error', { detail: String(error) })))
  },
  removeItem(key: string) {
    cache.delete(key)
    pending = pending.catch(() => {}).then(async () => { await write(key, null); localStorage.removeItem(key) })
  },
  flush: () => pending,
}
