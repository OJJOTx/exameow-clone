import { QuestionType, type ContentBlock, type Question, type QuestionBank, type PublicQuestion } from './types'

export const textBlock = (content: string): ContentBlock => ({ type: 'text', format: 'plain', content })
export function blockText(block?: ContentBlock): string {
  if (!block) return ''
  if (block.type === 'image') return '[Image]'
  return block.format === 'html' ? block.content.replace(/<[^>]*>/g, ' ') : block.content
}
export const headerText = (q: Pick<PublicQuestion, 'questionHeader'>) => q.questionHeader.map(blockText).join('\n')
export const explanationText = (q: Question) => q.explanation.general.map(blockText).join('\n')
export const hasExplanation = (q: Question) => q.explanation.general.length > 0 || Object.values(q.explanation.byOptionId).some(b => b.length > 0)
export function answerText(q: Question): string {
  if (q.correctAnswer === null) return ''
  if (typeof q.correctAnswer === 'string') return q.correctAnswer
  return q.correctAnswer.map(id => {
    const index = q.options.findIndex(o => o.id === id)
    return index < 0 ? id : String.fromCharCode(65 + index)
  }).join(', ')
}

function record(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object')
  return value as Record<string, any>
}
function blocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) throw new Error('Expected an array of content blocks')
  return value.map(contentBlock)
}
export function contentBlock(value: unknown): ContentBlock {
  const b = record(value)
  if (typeof b.content !== 'string') throw new Error('Block content must be a string')
  if (b.type === 'text' && (b.format === undefined || b.format === 'plain' || b.format === 'html')) {
    return { type: 'text', format: b.format ?? 'plain', content: b.content }
  }
  if (b.type === 'image' && /^data:image\/(?:png|jpeg|gif|webp|bmp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.content) && b.content.split(',')[1]) {
    return { type: 'image', content: b.content }
  }
  throw new Error('Use a text block or an embedded base64 PNG, JPEG, GIF, WebP or BMP image')
}

/** Accept legacy banks at boundaries; return only canonical fields, never source/page metadata. */
export function normalizeQuestion(value: unknown): Question {
  const q = record(value)
  const type = (q.type === 'multi_choice' ? 'multiple_choice' : q.type) as QuestionType
  if (!Object.values(QuestionType).includes(type)) throw new Error('Unsupported question type')
  if (typeof q.id !== 'string' || !q.id.trim()) throw new Error('Question needs an ID')
  const legacy = q.questionHeader === undefined
  const questionHeader = legacy ? [textBlock(String(q.stem ?? ''))] : blocks(q.questionHeader)
  if (!questionHeader.length) throw new Error('questionHeader cannot be empty')
  const options = (q.options ?? []).map((o: unknown, index: number) => {
    if (legacy && typeof o === 'string') return { id: String.fromCharCode(97 + index), content: textBlock(o) }
    const option = record(o)
    if (typeof option.id !== 'string' || !option.id.trim()) throw new Error('Option needs an ID')
    return { id: option.id, content: contentBlock(option.content) }
  })
  const ids = new Set<string>(options.map((o: { id: string }) => o.id))
  if (ids.size !== options.length) throw new Error('Option IDs must be unique')
  const choice = type === QuestionType.SingleChoice || type === QuestionType.MultiChoice
  let correctAnswer = q.correctAnswer
  if (legacy) {
    const answer = String(q.answer ?? '').trim()
    if (!answer) correctAnswer = null
    else if (!choice) correctAnswer = answer
    else {
      const exact = options.find((o: { content: ContentBlock }) => o.content.type === 'text' && o.content.content.replace(/^[A-Z][.)、]\s*/i, '').trim().toLowerCase() === answer.toLowerCase())
      const letters = /^[A-Z](?:[A-Z\s,;|、]*)$/i.test(answer) ? answer.toUpperCase().match(/[A-Z]/g) ?? [] : []
      const mapped = letters.map((c: string) => options[c.charCodeAt(0) - 65]?.id)
      correctAnswer = exact ? [exact.id] : mapped.length && mapped.every(Boolean) ? [...new Set(mapped)] : null
    }
  }
  if (correctAnswer === undefined) throw new Error('correctAnswer must be provided (use null if unknown)')
  if (choice) {
    if (options.length < 2) throw new Error('Choice questions need at least two options')
    if (correctAnswer !== null && (!Array.isArray(correctAnswer) || !correctAnswer.length || correctAnswer.some(id => !ids.has(id)) || new Set(correctAnswer).size !== correctAnswer.length || (type === QuestionType.SingleChoice && correctAnswer.length !== 1))) {
      throw new Error('correctAnswer must reference valid option IDs')
    }
  } else if (correctAnswer !== null && typeof correctAnswer !== 'string') throw new Error('Non-choice answers must be text or null')
  const explanation = legacy
    ? { general: q.analysis ? [textBlock(String(q.analysis))] : [], byOptionId: {} as Record<string, ContentBlock[]> }
    : { general: blocks(q.explanation?.general ?? []), byOptionId: {} as Record<string, ContentBlock[]> }
  if (!legacy) for (const [id, content] of Object.entries(record(q.explanation?.byOptionId ?? {}))) {
    if (!ids.has(id)) throw new Error('Explanation references an unknown option ID')
    explanation.byOptionId[id] = blocks(content)
  }
  return {
    id: q.id, type, questionHeader, options, correctAnswer, explanation,
    ...(typeof q.aiAnalysis === 'string' ? { aiAnalysis: q.aiAnalysis } : {}),
    ...(typeof q.score === 'number' && Number.isFinite(q.score) && q.score > 0 ? { score: q.score } : {}),
    ...(typeof q.subject === 'string' ? { subject: q.subject } : {}),
    ...(typeof q.chapter === 'string' && q.chapter.trim() ? { chapter: q.chapter.trim() } : {}),
    ...(['easy', 'medium', 'hard'].includes(q.difficulty) ? { difficulty: q.difficulty } : {}),
  }
}
export function normalizeBank(value: unknown): QuestionBank {
  const b = record(value)
  if (b.schemaVersion !== undefined && b.schemaVersion !== 2) throw new Error('Unsupported schemaVersion')
  if (typeof b.id !== 'string' || !b.id || typeof b.name !== 'string' || !Array.isArray(b.questions)) throw new Error('Bank requires id, name and questions')
  const questions = b.questions.map(normalizeQuestion)
  if (new Set(questions.map(q => q.id)).size !== questions.length) throw new Error('Question IDs must be unique within the bank')
  return { schemaVersion: 2, id: b.id, name: b.name, questions, createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now(), source: b.source ?? 'json-import' }
}
export function publicQuestion(q: Question): PublicQuestion {
  return { id: q.id, type: q.type, questionHeader: q.questionHeader, options: q.options }
}
// User selections are serialized ID arrays, so arbitrary IDs and multi-select remain unambiguous.
export function selectedIds(answer: string | null | undefined): string[] {
  if (!answer) return []
  try { const ids = JSON.parse(answer); return Array.isArray(ids) && ids.every(id => typeof id === 'string') ? ids : [] } catch { return [] }
}
export function migrateSelection(q: Question, answer: string | null): string | null {
  if (answer === null || (q.type !== QuestionType.SingleChoice && q.type !== QuestionType.MultiChoice)) return answer
  if (answer.startsWith('[')) return answer
  return JSON.stringify((answer.toUpperCase().match(/[A-Z]/g) ?? []).flatMap(c => q.options[c.charCodeAt(0) - 65]?.id ?? []))
}
export function selectionText(q: Question, answer: string | null): string {
  return q.type === QuestionType.SingleChoice || q.type === QuestionType.MultiChoice
    ? answerText({ ...q, correctAnswer: answer === null ? null : selectedIds(answer) }) : answer ?? ''
}
export function gradeQuestion(q: Question, answer: string | null | undefined): boolean | null {
  if (q.correctAnswer === null || q.type === QuestionType.ShortAnswer) return null
  if (!answer?.trim()) return false
  if (Array.isArray(q.correctAnswer)) {
    const ids = selectedIds(answer)
    return ids.length === new Set(ids).size && ids.length === q.correctAnswer.length && ids.every(id => q.correctAnswer!.includes(id))
  }
  if (q.type === QuestionType.TrueFalse) {
    const tf = (a: string) => /^(a|√|对|正确|true|t|是|yes|y|1)$/i.test(a.trim()) ? true : /^(b|×|错|错误|false|f|否|no|n|0)$/i.test(a.trim()) ? false : null
    return tf(answer) !== null && tf(answer) === tf(q.correctAnswer)
  }
  return answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
}
