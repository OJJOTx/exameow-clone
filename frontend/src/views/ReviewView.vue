<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { usePracticeStore } from '@/stores/practice'
import { useReportedQuestionsStore } from '@/stores/reportedQuestions'
import { useWrongQuestionsStore } from '@/stores/wrongQuestions'
import { headerText } from '@exameow/shared'
import type { Question } from '@exameow/shared'
import type { ReportedQuestionEntry } from '@/stores/reportedQuestions'
import QuestionBlockEditor from '@/components/practice/QuestionBlockEditor.vue'
import {
  ArrowLeftIcon,
  FlagIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const practiceStore = usePracticeStore()
const reportedStore = useReportedQuestionsStore()
const wrongStore = useWrongQuestionsStore()

const editingQuestion = ref<{ question: Question; bankId: string; questionId: string } | null>(null)
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

const reportedBanks = computed(() => reportedStore.getAllReported())

function getBankName(bankId: string): string {
  const bank = practiceStore.getBank(bankId)
  return bank?.name ?? i18n.t('practiceUnknownBank')
}

function getQuestionStem(bankId: string, questionId: string): string {
  const bank = practiceStore.getBank(bankId)
  const q = bank?.questions.find(q => q.id === questionId)
  return q ? headerText(q) : i18n.t('practiceQuestionGone')
}

function getQuestion(bankId: string, questionId: string): Question | undefined {
  const bank = practiceStore.getBank(bankId)
  return bank?.questions.find(q => q.id === questionId)
}

function reasonLabel(reason?: string): string {
  if (!reason) return ''
  const map: Record<string, string> = {
    wrong_answer: i18n.t('reportReasonWrongAnswer'),
    incomplete: i18n.t('reportReasonIncomplete'),
    wrong_options: i18n.t('reportReasonWrongOptions'),
    other: i18n.t('reportReasonOther'),
  }
  return map[reason] ?? reason
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function handleDismiss(bankId: string, questionId: string) {
  reportedStore.unreport(bankId, questionId)
}

function handleEdit(bankId: string, questionId: string) {
  const q = getQuestion(bankId, questionId)
  if (!q) return
  editingQuestion.value = { question: q, bankId, questionId }
}

function handleEditorSave(updatedQuestion: Question) {
  if (!editingQuestion.value) return
  const { bankId, questionId } = editingQuestion.value

  // 1. Update the question in the bank
  const success = practiceStore.updateQuestion(bankId, questionId, updatedQuestion)
  if (!success) {
    editingQuestion.value = null
    return
  }

  // 2. Re-grade session answers
  const changed = practiceStore.regradeAfterEdit(bankId, questionId, updatedQuestion)

  // 3. Reconcile wrong questions
  if (practiceStore.session && practiceStore.session.bankId === bankId) {
    wrongStore.reconcileAfterEdit(bankId, questionId, updatedQuestion, practiceStore.session.questions)
  }

  // 4. Mark report as resolved
  reportedStore.markResolved(bankId, questionId)

  // 5. Close editor and show toast
  editingQuestion.value = null
  if (changed > 0) {
    showToast(i18n.t('editorGradeChanged', { n: changed }))
  } else {
    showToast(i18n.t('editorSaveSuccess'))
  }
}

function handleEditorCancel() {
  editingQuestion.value = null
}
</script>

<template>
  <div class="max-w-3xl mx-auto pb-8">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-1">
      <button class="btn-icon !w-9 !h-9" @click="router.push('/mine')">
        <ArrowLeftIcon class="w-5 h-5 rtl:rotate-180" />
      </button>
      <div class="flex-1">
        <h1 class="text-display-sm font-bold tracking-tight">{{ i18n.t('reviewPageTitle') }}</h1>
      </div>
      <span
        v-if="reportedStore.unresolvedCount > 0"
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        {{ i18n.t('reviewFlaggedCount', { n: reportedStore.unresolvedCount }) }}
      </span>
    </div>
    <p class="text-body-lg mb-6 pl-12" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('reviewPageSubtitle') }}</p>

    <!-- Empty State -->
    <div v-if="reportedBanks.length === 0" class="card-outlined text-center py-14 px-6">
      <div
        class="w-[72px] h-[72px] rounded-[28px] flex items-center justify-center mx-auto mb-5 elevation-1"
        style="background: linear-gradient(135deg, rgb(var(--md-primary)), rgb(var(--md-tertiary)))"
      >
        <FlagIcon class="w-9 h-9 text-white" />
      </div>
      <h3 class="text-title-lg mb-2" style="color: rgb(var(--md-on-surface))">{{ i18n.t('reviewEmpty') }}</h3>
      <p class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('reviewPageSubtitle') }}</p>
    </div>

    <!-- Reported Banks -->
    <div v-else class="space-y-5">
      <div v-for="bankGroup in reportedBanks" :key="bankGroup.bankId">
        <!-- Bank Header -->
        <div class="flex items-center gap-2 mb-2">
          <DocumentTextIcon class="w-5 h-5 shrink-0" style="color: rgb(var(--md-primary))" />
          <h2 class="text-title-sm font-bold" style="color: rgb(var(--md-on-surface))">{{ getBankName(bankGroup.bankId) }}</h2>
          <span class="text-xs px-2 py-0.5 rounded-full" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))">
            {{ bankGroup.entries.length }}
          </span>
        </div>

        <!-- Questions List -->
        <div class="space-y-2">
          <div
            v-for="entry in bankGroup.entries"
            :key="entry.questionId"
            class="card-outlined p-4 transition-all duration-200 hover:shadow-sm"
          >
            <div class="flex items-start gap-3">
              <!-- Flag Icon -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
              >
                <FlagIcon class="w-4 h-4" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="text-sm line-clamp-2 mb-1" style="color: rgb(var(--md-on-surface))">
                  {{ getQuestionStem(bankGroup.bankId, entry.questionId) }}
                </div>
                <div class="flex items-center gap-3 text-xs" style="color: rgb(var(--md-on-surface-variant))">
                  <span v-if="entry.reason" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style="background-color: rgb(var(--md-tertiary-container)); color: rgb(var(--md-on-tertiary-container))">
                    {{ reasonLabel(entry.reason) }}
                  </span>
                  <span>{{ formatDate(entry.reportedAt) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  class="btn-icon !w-8 !h-8"
                  style="color: rgb(var(--md-primary))"
                  :title="i18n.t('reviewEditBtn')"
                  @click="handleEdit(bankGroup.bankId, entry.questionId)"
                >
                  <PencilSquareIcon class="w-4.5 h-4.5" />
                </button>
                <button
                  class="btn-icon !w-8 !h-8"
                  style="color: rgb(var(--md-on-surface-variant))"
                  :title="i18n.t('reviewDismissBtn')"
                  @click="handleDismiss(bankGroup.bankId, entry.questionId)"
                >
                  <XMarkIcon class="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Block Editor Modal -->
    <Transition name="scale">
      <QuestionBlockEditor
        v-if="editingQuestion"
        :question="editingQuestion.question"
        :bank-id="editingQuestion.bankId"
        @save="handleEditorSave"
        @cancel="handleEditorCancel"
      />
    </Transition>

    <!-- Toast -->
    <Transition name="scale">
      <div
        v-if="toast"
        class="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-[60] shadow-lg flex items-center gap-2"
        :style="{
          backgroundColor: 'rgb(var(--md-inverse-surface))',
          color: 'rgb(var(--md-inverse-on-surface))',
        }"
      >
        <CheckCircleIcon class="w-4 h-4" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>
