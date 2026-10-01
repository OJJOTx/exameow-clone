import { headerText, answerText, explanationText, blockText } from '@exameow/shared'
import type { AIConfig, AnswerResult, ExamParams, ExplainParams, ExplainResult, JudgeParams, JudgeResult, ModelInfo, Question } from '@exameow/shared'
import { resolveAIOptions } from '@exameow/shared'
import { AVAILABLE_CF_MODELS } from './cf-models'

export interface GenerateResult {
  questions: Question[]
}

function getBaseUrl(): string {
  if (import.meta.env.VITE_CF_API_URL) {
    return import.meta.env.VITE_CF_API_URL
  }
  return ''
}

export const cfApi = {
  async getModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/models`)
      if (res.ok) return res.json()
    } catch {}
    return AVAILABLE_CF_MODELS.map((m) => ({ id: m.id }))
  },

  async generateExam(
    file: File,
    params: ExamParams,
    config: AIConfig,
    signal?: AbortSignal,
  ): Promise<GenerateResult> {
    const formData = new FormData()
    if (!params.text) {
      formData.append('file', file)
    }
    formData.append('params', JSON.stringify(params))
    formData.append('model', config.model)
    formData.append('options', JSON.stringify(resolveAIOptions(config)))

    const res = await fetch(`${getBaseUrl()}/api/generate`, {
      method: 'POST',
      body: formData,
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async exportCsv(questions: Question[], filename: string = 'exameow_questions.csv'): Promise<void> {
    const csvContent = generateCsvContent(questions)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    downloadFile(url, filename)
  },

  async exportXlsx(questions: Question[], filename: string = 'exameow_questions.xlsx'): Promise<void> {
    const XLSX = await import('xlsx')
    const data = questions.map((q) => ({
      '题干（必填）': headerText(q),
      '题型 （必填）': typeLabel(q.type),
      '选项 A': blockText(q.options[0]?.content),
      '选项 B': blockText(q.options[1]?.content),
      '选项 C': blockText(q.options[2]?.content),
      '选项 D': blockText(q.options[3]?.content),
      '选项 E': blockText(q.options[4]?.content),
      '选项 F': blockText(q.options[5]?.content),
      '选项 G': blockText(q.options[6]?.content),
      '选项 H': blockText(q.options[7]?.content),
      '正确答案': answerText(q),
      '解析': explanationText(q),
      '学科': q.subject || '',
      '章节': q.chapter || '',
      '难度': q.difficulty || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    downloadFile(url, filename)
  },

  async answerQuestion(
    question: string,
    language: string,
    config: AIConfig,
    signal?: AbortSignal,
  ): Promise<AnswerResult> {
    const res = await fetch(`${getBaseUrl()}/api/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, language, model: config.model, options: resolveAIOptions(config) }),
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async judgeAnswer(
    params: JudgeParams,
    language: string,
    config: AIConfig,
    signal?: AbortSignal,
  ): Promise<JudgeResult> {
    const res = await fetch(`${getBaseUrl()}/api/judge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stem: params.stem,
        reference_answer: params.reference_answer,
        analysis: params.analysis,
        user_answer: params.user_answer,
        language,
        model: config.model,
        options: resolveAIOptions(config),
      }),
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async explainQuestion(
    params: ExplainParams,
    language: string,
    config: AIConfig,
    signal?: AbortSignal,
  ): Promise<ExplainResult> {
    const res = await fetch(`${getBaseUrl()}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stem: params.stem,
        reference_answer: params.reference_answer,
        analysis: params.analysis,
        language,
        model: config.model,
        options: resolveAIOptions(config),
      }),
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async saveConfig(config: AIConfig): Promise<void> {
    localStorage.setItem('exameow_cf_config', JSON.stringify(config))
  },

  async loadConfig(): Promise<AIConfig | null> {
    const stored = localStorage.getItem('exameow_cf_config')
    if (stored) return JSON.parse(stored)
    return {
      endpoint: '',
      api_key: '',
      model: AVAILABLE_CF_MODELS[0]?.id || '@cf/meta/llama-4-scout-17b-16e-instruct',
    }
  },
};

export function generateCsvContent(questions: Question[]): string {
  const typeLabels: Record<string, string> = {
    single_choice: '单选题', multiple_choice: '多选题',
    true_false: '判断题', fill_blank: '填空题',
    short_answer: '简答题',
  }
  const headers = ['题干', '题型', '选项A', '选项B', '选项C', '选项D', '选项E', '选项F', '选项G', '选项H', '正确答案', '解析', '学科', '章节', '难度']
  const rows = questions.map((q) => [
    headerText(q),
    typeLabels[q.type] || q.type,
    blockText(q.options[0]?.content),
    blockText(q.options[1]?.content),
    blockText(q.options[2]?.content),
    blockText(q.options[3]?.content),
    blockText(q.options[4]?.content),
    blockText(q.options[5]?.content),
    blockText(q.options[6]?.content),
    blockText(q.options[7]?.content),
    answerText(q),
    explanationText(q),
    q.subject || '',
    q.chapter || '',
    q.difficulty || '',
  ])
  const csvRows = [headers, ...rows].map((r) =>
    r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
  )
  return '\uFEFF' + csvRows.join('\n')
}

function typeLabel(qtype: string): string {
  const map: Record<string, string> = {
    single_choice: '单选题', multiple_choice: '多选题',
    true_false: '判断题', fill_blank: '填空题',
    short_answer: '简答题',
  }
  return map[qtype] || '简答题'
}

function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
