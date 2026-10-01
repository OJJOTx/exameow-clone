import { normalizeQuestion } from '@exameow/shared'
import { api } from '@/api'
import { generateCsvContent } from '@/api/http'
import { exportBankToWord } from '@/utils/wordExport'
import type { QuestionBank } from '@exameow/shared'

export type BankExportFormat = 'json' | 'csv' | 'xlsx' | 'word'

export interface BankExportResult {
  ok: boolean
  path?: string
  error?: string
  cancelled?: boolean
}

function isTauriPlatform(): boolean {
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned || 'exameow_bank'
}

async function saveTauri(filename: string, questions: QuestionBank['questions'], format: BankExportFormat): Promise<string | null> {
  try {
    const mod: any = await import('@tauri-apps/plugin-dialog')
    const path = await mod.save({
      defaultPath: filename,
      filters: [{ name: 'File', extensions: [format] }],
    })
    if (!path) return null
    if (format === 'csv') {
      await api.exportCsv(questions, path)
    } else {
      await api.exportXlsx(questions, path)
    }
    return path
  } catch {
    // fall through to downloads fallback
  }
  const b64 = format === 'csv'
    ? btoa(unescape(encodeURIComponent(generateCsvContent(questions))))
    : await api.exportXlsxData(questions)
  const { tauriApi } = await import('@/api/bridge')
  return tauriApi.saveToDownloads(filename, b64)
}

export async function exportBank(bank: QuestionBank, format: BankExportFormat): Promise<BankExportResult> {
  if (format === 'json') {
    const filename = `${sanitizeFilename(bank.name)}.json`
    const json = JSON.stringify({ schemaVersion: 2, id: bank.id, name: bank.name, questions: bank.questions.map(normalizeQuestion) }, null, 2)
    try {
      if (isTauriPlatform()) {
        const { tauriApi } = await import('@/api/bridge')
        const bytes = new TextEncoder().encode(json)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
        const data = btoa(binary)
        let path: string | null
        try {
          const dialog: any = await import('@tauri-apps/plugin-dialog')
          path = await dialog.save({ defaultPath: filename, filters: [{ name: 'JSON', extensions: ['json'] }] })
          if (!path) return { ok: false, cancelled: true }
        } catch {
          return { ok: true, path: await tauriApi.saveToDownloads(filename, data) }
        }
        await tauriApi.writeFile(path, data)
        return { ok: true, path }
      }
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return { ok: true, path: filename }
    } catch (error) { return { ok: false, error: String(error) } }
  }
  if (bank.questions.some(q => [...q.questionHeader, ...q.options.map(o => o.content), ...q.explanation.general, ...Object.values(q.explanation.byOptionId).flat()].some(b => b.type === 'image'))) {
    return { ok: false, error: 'Use JSON to export this bank with all embedded images.' }
  }
  if (format === 'word') {
    try {
      const files = await exportBankToWord(bank)
      return { ok: true, path: files.join('、') }
    } catch (e: any) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  }
  const filename = `${sanitizeFilename(bank.name)}.${format}`
  try {
    if (isTauriPlatform()) {
      const path = await saveTauri(filename, bank.questions, format)
      if (path === null) return { ok: false, cancelled: true }
      return { ok: true, path }
    }
    if (format === 'csv') {
      await api.exportCsv(bank.questions, undefined, filename)
    } else {
      await api.exportXlsx(bank.questions, undefined, filename)
    }
    return { ok: true, path: filename }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}
