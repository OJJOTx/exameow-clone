<script setup lang="ts">
import { selectedIds } from '@exameow/shared'
import ContentBlocks from '@/components/common/ContentBlocks.vue'
import QuestionExplanation from '@/components/common/QuestionExplanation.vue'
import { hasExplanation } from '@exameow/shared'

import { headerText, answerText, explanationText } from '@exameow/shared'

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useConfigStore } from '@/stores/config'
import type { Question, PracticeMode } from '@exameow/shared'
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  SparklesIcon,
  FlagIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  question: Question
  mode: PracticeMode
  userAnswer: string | null
  isCorrect: boolean | null
  submitted: boolean
  questionNumber: number
  autoAdvancing: boolean
  wrongCount?: number
  isWrongMode?: boolean
  flashcardMode?: boolean
  aiConfigured?: boolean
  aiJudging?: boolean
  aiFeedback?: string | null
  aiJudgeError?: string | null
  aiExplaining?: boolean
  aiExplainError?: string | null
  isReported?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', answer: string | null): void
  (e: 'selfCheck', correct: boolean): void
  (e: 'select', answer: string | null): void
  (e: 'removeWrong'): void
  (e: 'aiJudge'): void
  (e: 'aiCancel'): void
  (e: 'aiExplain'): void
  (e: 'regrade', correct: boolean): void
  (e: 'report'): void
}>()

const i18n = useI18nStore()
const configStore = useConfigStore()
const router = useRouter()

const shouldShowExplanation = computed(() => {
  const mode = configStore.practiceExplanationMode || 'incorrect'
  if (mode === 'never') return false
  if (mode === 'always') return true
  
  // mode === 'incorrect'
  if (props.isCorrect === true) return false
  if (props.isCorrect === false) return true
  
  return showFlashcardPreview.value
})

function goConfig() {
  router.push('/mine/config')
}

const answerRevealed = ref(false)

const isChoiceType = computed(() => {
  return props.question.type === 'single_choice' ||
    props.question.type === 'multiple_choice' ||
    props.question.type === 'true_false'
})

const isSelfCheckType = computed(() => {
  return props.question.type === 'fill_blank' || props.question.type === 'short_answer'
})

const showFlashcardPreview = computed(() => {
  return props.flashcardMode === true && !props.submitted
})

const interactive = computed(() => {
  return !props.submitted && !props.flashcardMode
})

const optionLabels = 'ABCDEFGH'.split('')

const correctAnswerSet = computed(() => {
  if (props.question.type === 'true_false') {
    if (props.question.correctAnswer === null) return new Set<string>()
    const a = answerText(props.question).trim()
    const isTrue = ['A', '√', '对', '正确', 'TRUE', 'T', '是', 'YES', 'Y', '1'].some(
      v => a.toUpperCase() === v.toUpperCase() || a.includes(v)
    )
    return new Set<string>(isTrue ? ['A'] : ['B'])
  }
  return new Set(Array.isArray(props.question.correctAnswer) ? props.question.correctAnswer : [])
})

const selectedSet = computed(() => {
  if (!props.userAnswer) return new Set<string>()
  return new Set(props.question.type === 'true_false' ? [props.userAnswer] : selectedIds(props.userAnswer))
})

const canSubmit = computed(() => {
  if (props.submitted) return false
  if (props.question.type === 'multiple_choice') return selectedSet.value.size > 0
  if (isChoiceType.value) return selectedSet.value.size > 0
  return false
})

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    single_choice: i18n.t('typeSingle'),
    multiple_choice: i18n.t('typeMulti'),
    true_false: i18n.t('typeTrueFalse'),
    fill_blank: i18n.t('typeFillBlank'),
    short_answer: i18n.t('typeShortAnswer'),
  }
  return labels[props.question.type] ?? props.question.type
})

const trueFalseOptions = computed(() => {
  const locale = i18n.locale
  const trueLabel = locale === 'zh' ? '对 (True)' : locale === 'zh-TW' ? '對 (True)' : locale === 'ja' ? '正しい (True)' : locale === 'ko' ? '참 (True)' : locale === 'es' ? 'Verdadero (True)' : locale === 'fr' ? 'Vrai (True)' : locale === 'de' ? 'Richtig (True)' : locale === 'ru' ? 'Верно (True)' : 'True'
  const falseLabel = locale === 'zh' ? '错 (False)' : locale === 'zh-TW' ? '錯 (False)' : locale === 'ja' ? '誤り (False)' : locale === 'ko' ? '거짓 (False)' : locale === 'es' ? 'Falso (False)' : locale === 'fr' ? 'Faux (False)' : locale === 'de' ? 'Falsch (False)' : locale === 'ru' ? 'Неверно (False)' : 'False'
  return [
    { label: `A. ${trueLabel}`, value: 'A' },
    { label: `B. ${falseLabel}`, value: 'B' },
  ]
})

function selectOption(opt: string) {
  if (!interactive.value) return

  if (props.question.type === 'single_choice' || props.question.type === 'true_false') {
    emit('submit', props.question.type === 'true_false' ? opt : JSON.stringify([opt]))
    return
  }
  const current = new Set(selectedSet.value)
  if (current.has(opt)) {
    current.delete(opt)
  } else {
    current.add(opt)
  }
  const ans = current.size ? JSON.stringify(Array.from(current).sort()) : ''
  emit('select', ans || null)
}

function confirmMultiChoice() {
  emit('submit', props.userAnswer)
}

function handleTextInput(e: Event) {
  const val = (e.target as HTMLInputElement | HTMLTextAreaElement).value
  emit('select', val || null)
}

function handleSelfCheck(correct: boolean) {
  if (props.submitted) return
  emit('selfCheck', correct)
}

function getOptionStyle(opt: string, idx: number) {
  if (showFlashcardPreview.value) {
    const isCorrect = correctAnswerSet.value.has(opt)
    if (isCorrect) {
      return {
        borderColor: 'rgb(76, 175, 80)',
        backgroundColor: 'rgba(76, 175, 80, 0.12)',
      }
    }
    return {
      borderColor: 'rgb(var(--md-outline-variant))',
      backgroundColor: 'transparent',
    }
  }

  if (!props.submitted) {
    const isSelected = selectedSet.value.has(opt)
    return {
      borderColor: isSelected ? 'rgb(var(--md-primary))' : 'rgb(var(--md-outline-variant))',
      backgroundColor: isSelected ? 'rgba(var(--md-primary), 0.08)' : 'transparent',
    }
  }

  const isCorrect = correctAnswerSet.value.has(opt)
  const wasChosen = selectedSet.value.has(opt)

  if (isCorrect) {
    return {
      borderColor: 'rgb(76, 175, 80)',
      backgroundColor: wasChosen ? 'rgba(76, 175, 80, 0.12)' : 'rgba(76, 175, 80, 0.06)',
    }
  }
  if (!isCorrect && wasChosen) {
    return {
      borderColor: 'rgb(var(--md-error))',
      backgroundColor: 'rgba(var(--md-error), 0.08)',
    }
  }
  return {
    borderColor: 'rgb(var(--md-outline-variant))',
    backgroundColor: 'transparent',
  }
}

function getBadgeStyle(opt: string) {
  if (showFlashcardPreview.value) {
    const isCorrect = correctAnswerSet.value.has(opt)
    return {
      backgroundColor: isCorrect ? 'rgb(76, 175, 80)' : 'rgb(var(--md-surface-container-highest))',
      color: isCorrect ? '#ffffff' : 'rgb(var(--md-on-surface-variant))',
    }
  }

  if (!props.submitted) {
    const isSelected = selectedSet.value.has(opt)
    return {
      backgroundColor: isSelected ? 'rgb(var(--md-primary))' : 'rgb(var(--md-surface-container-highest))',
      color: isSelected ? 'rgb(var(--md-on-primary))' : 'rgb(var(--md-on-surface-variant))',
    }
  }
  const isCorrect = correctAnswerSet.value.has(opt)
  const wasChosen = selectedSet.value.has(opt)

  if (isCorrect) {
    return { backgroundColor: 'rgb(76, 175, 80)', color: '#ffffff' }
  }
  if (!isCorrect && wasChosen) {
    return { backgroundColor: 'rgb(var(--md-error))', color: 'rgb(var(--md-on-error))' }
  }
  return { backgroundColor: 'rgb(var(--md-surface-container-highest))', color: 'rgb(var(--md-on-surface-variant))' }
}
</script>

<template>
  <div class="card-elevated p-4 sm:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
          :style="{
            backgroundColor: 'rgb(var(--md-primary-container))',
            color: 'rgb(var(--md-on-primary-container))',
          }"
        >{{ questionNumber }}</span>
        <span
          class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium"
          :style="{
            backgroundColor: 'rgb(var(--md-secondary-container))',
            color: 'rgb(var(--md-on-secondary-container))',
          }"
        >{{ typeLabel }}</span>
        <span
          v-if="flashcardMode"
          class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium"
          :style="{
            backgroundColor: 'rgb(var(--md-tertiary-container))',
            color: 'rgb(var(--md-on-tertiary-container))',
          }"
        >{{ i18n.t('practiceModeFlashcard') }}</span>
      </div>

      <!-- Result badge after submit -->
      <div v-if="submitted && isCorrect !== null" class="flex items-center gap-1.5">
        <template v-if="isCorrect">
          <CheckCircleIcon class="w-5 h-5" :style="{ color: 'rgb(var(--md-primary))' }" />
          <span class="text-sm font-bold" :style="{ color: 'rgb(var(--md-primary))' }">
            {{ i18n.t('practiceCorrect') }}
          </span>
        </template>
        <template v-else>
          <XCircleIcon class="w-5 h-5" :style="{ color: 'rgb(var(--md-error))' }" />
          <span class="text-sm font-bold" :style="{ color: 'rgb(var(--md-error))' }">
            {{ i18n.t('practiceIncorrect') }}
          </span>
        </template>
      </div>

      <!-- Remove from wrong questions button -->
      <button
        v-if="isWrongMode && !submitted"
        class="btn-tonal !h-8 text-xs !px-3 shrink-0"
        :style="{ borderColor: 'rgb(var(--md-error))', color: 'rgb(var(--md-error))' }"
        @click="emit('removeWrong')"
      >
        <XMarkIcon class="w-3.5 h-3.5" />
        {{ i18n.t('practiceRemoveWrong') }}
      </button>

      <!-- Report/Flag question button -->
      <button
        class="btn-icon !w-8 !h-8 shrink-0 transition-all duration-200"
        :style="{
          color: isReported ? 'rgb(var(--md-error))' : 'rgb(var(--md-on-surface-variant))',
        }"
        :title="isReported ? i18n.t('reportAlreadyFlagged') : i18n.t('reportFlagQuestion')"
        @click="emit('report')"
      >
        <FlagIcon class="w-4.5 h-4.5" :class="{ 'fill-current': isReported }" />
      </button>
    </div>

    <!-- Stem -->
    <div class="text-body-lg mb-5" :style="{ color: 'rgb(var(--md-on-surface))' }">
      <ContentBlocks :blocks="question.questionHeader" />
    </div>

    <!-- Wrong count badge -->
    <div
      v-if="wrongCount !== undefined && wrongCount > 0"
      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mb-4"
      :style="{
        backgroundColor: 'rgba(var(--md-error), 0.12)',
        color: 'rgb(var(--md-error))',
      }"
    >
      <XCircleIcon class="w-3.5 h-3.5" />
      {{ i18n.t('wrongTimesCount', { n: wrongCount }) }}
    </div>

    <!-- Choice / TrueFalse Options -->
    <div v-if="isChoiceType" class="space-y-2.5 mb-5">
      <template v-if="question.type === 'true_false'">
        <button
          v-for="opt in trueFalseOptions"
          :key="opt.value"
          class="w-full text-left p-3.5 rounded-[20px] border transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col gap-2 cursor-pointer active:scale-[0.98] shadow-xs"
          :disabled="!interactive"
          :style="getOptionStyle(opt.value, 0)"
          @click="selectOption(opt.value)"
        >
          <div class="flex items-start gap-3.5 w-full">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-transform duration-200"
              :style="getBadgeStyle(opt.value)"
            >{{ opt.value }}</div>
            <div class="text-sm font-medium flex-1 pt-1.5" :style="{ color: 'rgb(var(--md-on-surface))' }">
              {{ opt.label.replace(/^[A-Z]\.\s*/, '') }}
            </div>
            <CheckCircleIcon
              v-if="(submitted || showFlashcardPreview) && correctAnswerSet.has(opt.value)"
              class="w-5 h-5 ml-auto animate-spring-pop shrink-0 mt-1.5"
              :style="{ color: 'rgb(76, 175, 80)' }"
            />
            <XCircleIcon
              v-if="submitted && !correctAnswerSet.has(opt.value) && selectedSet.has(opt.value)"
              class="w-5 h-5 ml-auto animate-spring-pop shrink-0 mt-1.5"
              :style="{ color: 'rgb(var(--md-error))' }"
            />
          </div>
          <div
            v-if="shouldShowExplanation && (submitted || showFlashcardPreview) && (question.explanation?.byOptionId?.[opt.value]?.length ?? 0) > 0"
            class="pl-[46px] pr-2 text-xs animate-fade-in"
          >
            <div class="flex items-center gap-1.5 font-bold mb-1" :style="{ color: correctAnswerSet.has(opt.value) ? 'rgb(76, 175, 80)' : (selectedSet.has(opt.value) ? 'rgb(var(--md-error))' : 'rgb(var(--md-outline-variant))') }">
              <CheckCircleIcon v-if="correctAnswerSet.has(opt.value)" class="w-4 h-4" />
              <XCircleIcon v-else class="w-4 h-4" />
              <span>{{ correctAnswerSet.has(opt.value) ? i18n.t('practiceCorrect') : i18n.t('practiceIncorrect') }}</span>
            </div>
            <div :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
              <ContentBlocks :blocks="question.explanation.byOptionId[opt.value]!" />
            </div>
          </div>
        </button>
      </template>
      <template v-else>
        <button
          v-for="(opt, idx) in question.options"
          :key="opt.id"
          class="w-full text-left p-3.5 rounded-[20px] border transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col gap-2 cursor-pointer active:scale-[0.98] shadow-xs"
          :disabled="!interactive"
          :style="getOptionStyle(opt.id, idx)"
          @click="selectOption(opt.id)"
        >
          <div class="flex items-start gap-3.5 w-full">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-transform duration-200"
              :style="getBadgeStyle(opt.id)"
            >{{ optionLabels[idx] }}</div>
            <div class="text-sm font-medium flex-1 pt-1.5" :style="{ color: 'rgb(var(--md-on-surface))' }">
              <ContentBlocks :blocks="[opt.content]" />
            </div>
            <CheckCircleIcon
              v-if="(submitted || showFlashcardPreview) && correctAnswerSet.has(opt.id)"
              class="w-5 h-5 ml-auto animate-spring-pop shrink-0 mt-1.5"
              :style="{ color: 'rgb(76, 175, 80)' }"
            />
            <XCircleIcon
              v-if="submitted && !correctAnswerSet.has(opt.id) && selectedSet.has(opt.id)"
              class="w-5 h-5 ml-auto animate-spring-pop shrink-0 mt-1.5"
              :style="{ color: 'rgb(var(--md-error))' }"
            />
          </div>
          <div
            v-if="shouldShowExplanation && (submitted || showFlashcardPreview) && (question.explanation?.byOptionId?.[opt.id]?.length ?? 0) > 0"
            class="pl-[46px] pr-2 text-xs animate-fade-in"
          >
            <div class="flex items-center gap-1.5 font-bold mb-1" :style="{ color: correctAnswerSet.has(opt.id) ? 'rgb(76, 175, 80)' : (selectedSet.has(opt.id) ? 'rgb(var(--md-error))' : 'rgb(var(--md-outline-variant))') }">
              <CheckCircleIcon v-if="correctAnswerSet.has(opt.id)" class="w-4 h-4" />
              <XCircleIcon v-else class="w-4 h-4" />
              <span>{{ correctAnswerSet.has(opt.id) ? i18n.t('practiceCorrect') : i18n.t('practiceIncorrect') }}</span>
            </div>
            <div :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
              <ContentBlocks :blocks="question.explanation.byOptionId[opt.id]!" />
            </div>
          </div>
        </button>
      </template>
    </div>

      <!-- Multi-choice confirm button -->
      <div v-if="question.type === 'multiple_choice' && interactive" class="mt-3">
        <button
          class="btn-filled w-full"
          :disabled="!canSubmit"
          @click="confirmMultiChoice"
        >
          {{ i18n.t('practiceConfirmAnswer') }}
        </button>
      </div>

      <div v-if="question.type === 'single_choice' && interactive" class="text-xs mt-2 text-center" :style="{ color: 'rgb(var(--md-on-surface-muted))' }">
        {{ i18n.t('practiceClickToSubmit') }}
      </div>
      <div v-if="question.type === 'true_false' && interactive" class="text-xs mt-2 text-center" :style="{ color: 'rgb(var(--md-on-surface-muted))' }">
        {{ i18n.t('practiceClickToSubmit') }}
      </div>
      <div v-if="autoAdvancing" class="text-xs mt-1 text-center font-medium" :style="{ color: 'rgb(var(--md-primary))' }">
        {{ i18n.t('practiceCorrectAdvancing') }}
      </div>

    <!-- Fill Blank / Short Answer -->
    <div v-if="isSelfCheckType" class="mb-4">
      <textarea
        v-if="question.type === 'short_answer'"
        class="input-outlined !min-h-[100px]"
        :value="userAnswer ?? ''"
        :placeholder="i18n.t('practiceInputAnswer')"
        :disabled="!interactive"
        @input="handleTextInput"
      />
      <input
        v-else
        class="input-outlined"
        :value="userAnswer ?? ''"
        :placeholder="i18n.t('practiceInputAnswerShort')"
        :disabled="!interactive"
        @input="handleTextInput"
      />

      <!-- Action buttons (before reveal, before submit) -->
      <template v-if="userAnswer && interactive && !answerRevealed">
        <div class="flex gap-2 mt-3">
          <button
            v-if="question.type === 'fill_blank'"
            class="btn-filled !h-9 text-sm flex-1"
            @click="emit('submit', userAnswer)"
          >
            {{ i18n.t('practiceSubmitAuto') }}
          </button>
          <button
            v-if="question.type === 'short_answer'"
            class="btn-filled !h-9 text-sm flex-1"
            :disabled="!aiConfigured || aiJudging"
            @click="emit('aiJudge')"
          >
            <SparklesIcon class="w-4 h-4" />
            {{ aiJudging ? i18n.t('practiceAiJudging') : i18n.t('practiceAiJudge') }}
          </button>
          <button
            v-if="aiJudging"
            class="btn-outlined !h-9 text-sm shrink-0"
            @click="emit('aiCancel')"
          >
            {{ i18n.t('searchCancel') }}
          </button>
          <button
            v-else
            class="btn-outlined !h-9 text-sm flex-1"
            @click="answerRevealed = true"
          >
            {{ i18n.t('practiceRevealAnswer') }}
          </button>
        </div>
        <div class="text-xs mt-2 text-center" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          {{ question.type === 'fill_blank' ? i18n.t('practiceSubmitAutoHint') : i18n.t('practiceAiJudgeHint') }}
          · {{ i18n.t('practiceRevealHint') }}
        </div>
        <button
          v-if="question.type === 'short_answer' && !aiConfigured"
          class="text-xs mt-1 mx-auto flex items-center gap-1 underline"
          :style="{ color: 'rgb(var(--md-error))' }"
          @click="goConfig"
        >
          {{ i18n.t('searchNotConfigured') }}
        </button>
        <div
          v-if="aiJudgeError"
          class="mt-2 p-3 rounded-xl text-sm flex items-center justify-between gap-2"
          :style="{ backgroundColor: 'rgba(var(--md-error), 0.08)', color: 'rgb(var(--md-error))' }"
        >
          <span class="min-w-0 break-words">{{ aiJudgeError }}</span>
          <button class="btn-tonal !h-7 !px-3 text-xs shrink-0" @click="emit('aiJudge')">
            {{ i18n.t('searchRetry') }}
          </button>
        </div>
      </template>

      <!-- Revealed answer panel (before submit) -->
      <div
        v-if="answerRevealed && interactive"
        class="mt-3 p-3 rounded-xl animate-slide-up"
        :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }"
      >
        <div class="text-label-sm mb-1" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          {{ i18n.t('practiceReviewCorrectAnswer') }}
        </div>
        <div class="text-sm" :style="{ color: 'rgb(var(--md-primary))' }">
          {{ answerText(question) }}
        </div>
        <div v-if="shouldShowExplanation && hasExplanation(question)" class="mt-2 text-sm" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          <span class="text-label-sm">{{ i18n.t('practiceReviewAnalysis') }}：</span><QuestionExplanation :question="question" />
        </div>
      </div>

      <!-- Self-check buttons (only after reveal) -->
      <div v-if="userAnswer && interactive && answerRevealed" class="flex gap-2 mt-3">
        <button class="btn-tonal !h-9 text-sm flex-1" @click="handleSelfCheck(true)">
          <CheckCircleIcon class="w-4 h-4" />
          {{ i18n.t('practiceSelfCheckCorrect') }}
        </button>
        <button class="btn-outlined !h-9 text-sm flex-1" @click="handleSelfCheck(false)">
          {{ i18n.t('practiceSelfCheckWrong') }}
        </button>
      </div>

      <!-- Result after submit -->
      <div v-if="submitted" class="mt-3 p-3 rounded-xl animate-slide-up" :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }">
        <div class="text-label-sm mb-1" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          {{ i18n.t('practiceReviewYourAnswer') }}
        </div>
        <div class="text-sm mb-3" :style="{ color: isCorrect ? 'rgb(var(--md-primary))' : 'rgb(var(--md-error))' }">
          {{ userAnswer || i18n.t('practiceUnanswered') }}
        </div>
        <div class="text-label-sm mb-1" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          {{ i18n.t('practiceReviewCorrectAnswer') }}
        </div>
        <div class="text-sm" :style="{ color: 'rgb(var(--md-primary))' }">
          {{ answerText(question) }}
        </div>
        <div v-if="shouldShowExplanation && hasExplanation(question)" class="mt-2 text-sm" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          <span class="text-label-sm">{{ i18n.t('practiceReviewAnalysis') }}：</span><QuestionExplanation :question="question" />
        </div>
        <div v-if="shouldShowExplanation && aiFeedback" class="mt-2 text-sm" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          <span class="text-label-sm">{{ i18n.t('practiceAiFeedback') }}：</span>{{ aiFeedback }}
        </div>
      </div>

      <!-- Regrade (short answer, after submit) -->
      <div v-if="submitted && question.type === 'short_answer' && !flashcardMode" class="mt-3">
        <div class="text-xs mb-2 text-center" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          {{ i18n.t('practiceRegradeHint') }}
        </div>
        <div class="flex gap-2">
          <button class="btn-tonal !h-9 text-sm flex-1" @click="emit('regrade', true)">
            <CheckCircleIcon class="w-4 h-4" />
            {{ i18n.t('practiceSelfCheckCorrect') }}
          </button>
          <button class="btn-outlined !h-9 text-sm flex-1" @click="emit('regrade', false)">
            {{ i18n.t('practiceSelfCheckWrong') }}
          </button>
        </div>
      </div>

      <!-- Flashcard preview for self-check types -->
      <div v-if="showFlashcardPreview" class="mt-3 p-3 rounded-xl animate-slide-up" :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }">
        <div class="text-label-sm mb-1" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          {{ i18n.t('practiceReviewCorrectAnswer') }}
        </div>
        <div class="text-sm" :style="{ color: 'rgb(var(--md-primary))' }">
          {{ answerText(question) }}
        </div>
        <div v-if="shouldShowExplanation && hasExplanation(question)" class="mt-2 text-sm" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          <span class="text-label-sm">{{ i18n.t('practiceReviewAnalysis') }}：</span><QuestionExplanation :question="question" />
        </div>
      </div>
    </div>

    <!-- Correct answer display for choice types (when wrong) -->
    <div
      v-if="submitted && isCorrect === false && isChoiceType"
      class="mt-4 p-3 rounded-xl animate-slide-up"
      :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }"
    >
      <div class="text-label-sm mb-1" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
        {{ i18n.t('practiceReviewCorrectAnswer') }}
      </div>
      <div class="text-sm font-bold" :style="{ color: 'rgb(var(--md-primary))' }">
        {{ answerText(question) }}
      </div>
    </div>

    <p v-if="submitted && question.correctAnswer === null" class="mt-3 text-sm">Answer unknown — this question is not graded.</p>
    <!-- Analysis for choice types (flashcard preview or submitted) -->
    <div v-if="shouldShowExplanation && showFlashcardPreview && isChoiceType && question.explanation?.general?.length > 0" class="mt-3 animate-slide-up">
      <div class="px-3 py-2.5 rounded-xl text-sm" :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))', color: 'rgb(var(--md-on-surface-variant))' }">
        <span class="text-label-sm mr-2" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">{{ i18n.t('practiceReviewAnalysis') }}：</span>
        <ContentBlocks :blocks="question.explanation.general" />
      </div>
    </div>

    <!-- Analysis for choice types (normal submitted) -->
    <div v-if="shouldShowExplanation && submitted && isChoiceType && question.explanation?.general?.length > 0 && !showFlashcardPreview" class="mt-3 animate-slide-up">
      <div class="px-3 py-2.5 rounded-xl text-sm" :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))', color: 'rgb(var(--md-on-surface-variant))' }">
        <span class="text-label-sm mr-2" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">{{ i18n.t('practiceReviewAnalysis') }}：</span>
        <ContentBlocks :blocks="question.explanation.general" />
      </div>
    </div>

    <!-- AI analysis (submitted, non-mock modes) -->
    <div v-if="shouldShowExplanation && submitted && mode !== 'mock'" class="mt-3 animate-slide-up">
      <div class="px-3 py-2.5 rounded-xl text-sm" :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }">
        <div class="flex items-center justify-between gap-2" :class="{ 'mb-1': question.aiAnalysis || aiExplaining }">
          <span class="text-label-sm flex items-center gap-1" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
            <SparklesIcon class="w-3.5 h-3.5" />
            {{ i18n.t('practiceAiExplain') }}
          </span>
          <div class="flex items-center gap-2">
            <button
              v-if="aiExplaining"
              class="btn-outlined !h-7 !px-3 text-xs shrink-0"
              @click="emit('aiCancel')"
            >
              {{ i18n.t('searchCancel') }}
            </button>
            <button
              v-else
              class="btn-tonal !h-7 !px-3 text-xs shrink-0"
              :disabled="!aiConfigured"
              @click="emit('aiExplain')"
            >
              <SparklesIcon class="w-3.5 h-3.5" />
              {{ question.aiAnalysis ? i18n.t('practiceAiRegenerate') : i18n.t('practiceAiExplain') }}
            </button>
          </div>
        </div>
        <div v-if="aiExplaining" class="text-sm" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
          {{ i18n.t('practiceAiExplaining') }}
        </div>
        <div v-else-if="question.aiAnalysis" class="whitespace-pre-wrap" :style="{ color: 'rgb(var(--md-on-surface))' }">
          {{ question.aiAnalysis }}
        </div>
        <div
          v-if="aiExplainError"
          class="mt-2 text-sm"
          :style="{ color: 'rgb(var(--md-error))' }"
        >
          {{ aiExplainError }}
        </div>
        <button
          v-if="!aiConfigured"
          class="text-xs mt-1 flex items-center gap-1 underline"
          :style="{ color: 'rgb(var(--md-error))' }"
          @click="goConfig"
        >
          {{ i18n.t('searchNotConfigured') }}
        </button>
      </div>
    </div>
  </div>
</template>
