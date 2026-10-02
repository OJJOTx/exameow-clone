import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePracticeStore } from './practice'

const STORAGE_KEY = 'exameow-reported-questions'

export interface ReportedQuestionEntry {
  questionId: string
  bankId: string
  reportedAt: number
  reason?: string
  resolved: boolean
}

function loadData(): Record<string, Record<string, ReportedQuestionEntry>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveData(data: Record<string, Record<string, ReportedQuestionEntry>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export const useReportedQuestionsStore = defineStore('reportedQuestions', () => {
  const data = ref(loadData())

  function save() {
    saveData(data.value)
  }

  function reportQuestion(bankId: string, questionId: string, reason?: string) {
    if (!data.value[bankId]) {
      data.value[bankId] = {}
    }
    const existing = data.value[bankId]![questionId]
    if (existing) {
      // Update the reason if re-reported
      existing.reason = reason ?? existing.reason
      existing.reportedAt = Date.now()
      existing.resolved = false
    } else {
      data.value[bankId]![questionId] = {
        questionId,
        bankId,
        reportedAt: Date.now(),
        reason,
        resolved: false,
      }
    }
    save()
  }

  function unreport(bankId: string, questionId: string) {
    if (!data.value[bankId]?.[questionId]) return
    delete data.value[bankId]![questionId]
    if (Object.keys(data.value[bankId]!).length === 0) {
      delete data.value[bankId]
    }
    save()
  }

  function markResolved(bankId: string, questionId: string) {
    const entry = data.value[bankId]?.[questionId]
    if (!entry) return
    entry.resolved = true
    save()
  }

  function isReported(bankId: string, questionId: string): boolean {
    return !!data.value[bankId]?.[questionId]
  }

  function getReportedForBank(bankId: string): ReportedQuestionEntry[] {
    const bank = data.value[bankId]
    if (!bank) return []
    return Object.values(bank).sort((a, b) => b.reportedAt - a.reportedAt)
  }

  function getAllReported(): { bankId: string; entries: ReportedQuestionEntry[] }[] {
    const practiceStore = usePracticeStore()
    return Object.entries(data.value)
      .map(([bankId, entriesMap]) => ({
        bankId,
        entries: Object.values(entriesMap)
          .filter(e => !e.resolved)
          .sort((a, b) => b.reportedAt - a.reportedAt),
      }))
      .filter(item => {
        const bank = practiceStore.getBank(item.bankId)
        return bank !== undefined && item.entries.length > 0
      })
  }

  const unresolvedCount = computed(() => {
    let count = 0
    for (const bankEntries of Object.values(data.value)) {
      for (const entry of Object.values(bankEntries)) {
        if (!entry.resolved) count++
      }
    }
    return count
  })

  function clearBank(bankId: string) {
    delete data.value[bankId]
    save()
  }

  return {
    data,
    reportQuestion,
    unreport,
    markResolved,
    isReported,
    getReportedForBank,
    getAllReported,
    unresolvedCount,
    clearBank,
  }
})
